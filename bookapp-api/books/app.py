import json
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from bson import ObjectId
from bson.errors import InvalidId
import datetime # For date validation
import boto3 # AWS SDK
import base64 # For decoding image data
import uuid # For generating unique S3 keys if needed

# Custom JSON encoder to handle datetime objects
def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime.datetime):
        return obj.isoformat() # or obj.strftime('%Y-%m-%d')
    if isinstance(obj, bytes):
        try:
            return obj.decode('utf-8') # Attempt to decode bytes to string
        except UnicodeDecodeError:
            return "<non-UTF8 binary data>" # Placeholder for non-UTF8 bytes
    raise TypeError ("Type %s not serializable" % type(obj))

# Initialize MongoDB client (reuse logic from authors/app.py or adapt as needed)
MONGODB_URI = os.environ.get("MONGODB_URI")
client = None
db = None

# Initialize S3 client
s3_client = boto3.client("s3")
BOOK_COVERS_S3_BUCKET = os.environ.get("BOOK_COVERS_S3_BUCKET")

if MONGODB_URI:
    try:
        print("Attempting to connect to MongoDB Atlas for books service...")
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ismaster')
        db_name = MONGODB_URI.split('/')[-1].split('?')[0] if '/' in MONGODB_URI else "BookApp"
        db = client[db_name]
        print(f"Successfully connected to MongoDB Atlas for books service, database: {db_name}")
    except ConnectionFailure as e:
        print(f"MongoDB connection failed for books service: {e}")
        db = None # Ensure db is None if connection failed
    except Exception as e:
        print(f"An error occurred during MongoDB client initialization for books service: {e}")
        db = None
else:
    print("MONGODB_URI environment variable not set for books service. Skipping MongoDB connection.")

def _get_db():
    """Helper to ensure DB is connected or raise an error."""
    if db is None:
        raise ConnectionFailure("Database not connected or not configured for books service.")
    return db

def _validate_book_data(data, is_update=False):
    """Validates book data for create and update operations."""
    errors = {}
    # Added coverImageBase64 as an optional field for validation if we add rules later
    # For now, just acknowledge its potential presence
    # required_fields = ["title", "author", "publishDate", "pageCount", "description"]
    
    # Make all fields optional on update if not already handled by is_update logic
    # Basic check for required fields on create
    if not is_update:
        for field in ["title", "author", "publishDate", "pageCount", "description"]:
            if field not in data:
                errors[field] = "is required"

    # Type and format validations (can be expanded)
    if "title" in data and not isinstance(data.get("title"), str):
        errors["title"] = "must be a string"
    if "author" in data: # Expecting author ID string
        if not isinstance(data.get("author"), str):
            errors["author"] = "must be a string (author ID)"
        else:
            try: 
                ObjectId(data.get("author"))
            except InvalidId:
                errors["author"] = "must be a valid ObjectId string for author"
    if "publishDate" in data:
        if not isinstance(data.get("publishDate"), str):
            errors["publishDate"] = "must be a string"
        else:
            try:
                datetime.datetime.strptime(data.get("publishDate"), "%Y-%m-%d")
            except ValueError:
                errors["publishDate"] = "must be a valid date in YYYY-MM-DD format"
    if "pageCount" in data and (not isinstance(data.get("pageCount"), int) or data.get("pageCount") <= 0):
        errors["pageCount"] = "must be a positive integer"
    if "description" in data and not isinstance(data.get("description"), str):
        errors["description"] = "must be a string"
    
    if data.get("title") == "": errors["title"] = "cannot be empty"
    # coverImageBase64 validation (e.g., check if it's a valid base64 string) can be added here

    return errors

def make_response(status_code, body, event=None):
    allowed_origins = [
        "http://localhost:3000",
        "https://bookapp.stanleyluong.com"
    ]
    origin = None
    if event and "headers" in event and "origin" in event["headers"]:
        req_origin = event["headers"]["origin"]
        if req_origin in allowed_origins:
            origin = req_origin
    if not origin:
        origin = "http://localhost:3000"
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        "body": json.dumps(body)
    }

def get_books_handler(event, context):
    """Handles GET requests to /books"""
    try:
        current_db = _get_db()
        print("Fetching books from MongoDB.")
        books_cursor = current_db.books.find({})
        books_list = []
        for book in books_cursor:
            book["_id"] = str(book["_id"])
            if "author" in book and isinstance(book["author"], ObjectId):
                 book["author"] = str(book["author"])
            # The explicit strftime is technically redundant now if json_serial handles datetime
            # but doesn't harm. Left for clarity or if json_serial changes.
            if "publishDate" in book and isinstance(book["publishDate"], datetime.datetime):
                book["publishDate"] = book["publishDate"].strftime("%Y-%m-%d")
            
            if BOOK_COVERS_S3_BUCKET and book.get("coverImageS3Key"):
                try:
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': book["coverImageS3Key"]},
                        ExpiresIn=3600  # URL expires in 1 hour
                    )
                    book["coverImageUrl"] = presigned_url
                except Exception as e:
                    print(f"Error generating presigned URL for {book['coverImageS3Key']}: {e}")
                    book["coverImageUrl"] = None # Or some error indicator

            books_list.append(book)
        print(f"Successfully fetched {len(books_list)} books.")
        return make_response(200, {"books": books_list}, event)
    except ConnectionFailure as e:
        print(f"MongoDB connection error in get_books_handler: {e}")
        return make_response(500, {"error": str(e)}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed in get_books_handler: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred in get_books_handler: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)


def create_book_handler(event, context):
    """Handles POST requests to /books to create a new book."""
    try:
        current_db = _get_db()
        body = event.get("body")
        if not body:
            return make_response(400, {"error": "Missing request body"}, event)
        
        book_data = json.loads(body)
        
        validation_errors = _validate_book_data(book_data)
        if validation_errors:
            return make_response(400, {"error": "Validation failed", "details": validation_errors}, event)

        # Convert author ID string to ObjectId before storing if that's the schema
        # For now, assuming author field in book_data is an ID string.
        # If you want to store it as ObjectId:
        # book_data["author"] = ObjectId(book_data["author"])

        # Convert publishDate string to datetime object if you want to store it as Date type in MongoDB
        # book_data["publishDate"] = datetime.datetime.strptime(book_data["publishDate"], "%Y-%m-%d")

        # Handle cover image upload to S3
        cover_image_base64 = book_data.pop("coverImageBase64", None) # Remove from data to be stored in DB directly
        s3_key_to_store = None

        if cover_image_base64 and BOOK_COVERS_S3_BUCKET:
            try:
                # Assume image is jpeg, can be made more sophisticated by checking mime type from base64 string
                image_data = base64.b64decode(cover_image_base64)
                # Generate a unique key for S3. Using book_id (once created) is good practice.
                # For now, let's plan to use the new_book_id for the key, means upload after insert or use a UUID first.
                # Let's use a UUID for filename for now, and prefix with a pseudo-folder.
                s3_object_key = f"covers/{uuid.uuid4()}.jpg"
                
                s3_client.put_object(
                    Bucket=BOOK_COVERS_S3_BUCKET, 
                    Key=s3_object_key, 
                    Body=image_data,
                    ContentType='image/jpeg' # Set content type
                )
                s3_key_to_store = s3_object_key
                print(f"Successfully uploaded cover image to S3: {s3_key_to_store}")
            except base64.binascii.Error as e: # Specific error for bad base64
                print(f"Invalid base64 data for cover image: {e}")
                # Potentially return a 400 error here if image is mandatory or critical
                # For now, we'll just skip upload and not set the key
            except Exception as e:
                print(f"Error uploading cover image to S3: {e}")
                # Handle error (e.g., log it, perhaps don't fail the whole book creation yet)
        
        if s3_key_to_store:
            book_data["coverImageS3Key"] = s3_key_to_store

        print(f"Attempting to create book with data: {book_data}")
        result = current_db.books.insert_one(book_data)
        new_book_id = str(result.inserted_id)
        print(f"Successfully created book with ID: {new_book_id}")

        # Fetch the created book to return it
        created_book = current_db.books.find_one({"_id": result.inserted_id})
        if created_book:
            created_book["_id"] = str(created_book["_id"])
            if "author" in created_book and isinstance(created_book["author"], ObjectId):
                 created_book["author"] = str(created_book["author"])
            # Redundant if json_serial covers it
            if "publishDate" in created_book and isinstance(created_book["publishDate"], datetime.datetime):
                created_book["publishDate"] = created_book["publishDate"].strftime("%Y-%m-%d")
            
            if BOOK_COVERS_S3_BUCKET and created_book.get("coverImageS3Key"):
                try:
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': created_book["coverImageS3Key"]},
                        ExpiresIn=3600
                    )
                    created_book["coverImageUrl"] = presigned_url
                except Exception as e:
                    print(f"Error generating presigned URL for created book {created_book['coverImageS3Key']}: {e}")
                    created_book["coverImageUrl"] = None

        return make_response(201, {"message": "Book created successfully", "book": created_book}, event)
    except ConnectionFailure as e:
        return make_response(500, {"error": str(e)}, event)
    except json.JSONDecodeError:
        return make_response(400, {"error": "Invalid JSON in request body"}, event)
    except OperationFailure as e:
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)


def get_book_by_id_handler(event, context):
    """Handles GET requests to /books/{bookId}."""
    try:
        current_db = _get_db()
        path_params = event.get("pathParameters")
        if not path_params or "bookId" not in path_params:
            return make_response(400, {"error": "Missing 'bookId' in path parameters"}, event)
        
        book_id_str = path_params["bookId"]
        print(f"Attempting to fetch book with ID: {book_id_str}")

        try:
            book_oid = ObjectId(book_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid bookId format"}, event)

        book = current_db.books.find_one({"_id": book_oid})

        if book:
            book["_id"] = str(book["_id"])
            if "author" in book and isinstance(book["author"], ObjectId):
                 book["author"] = str(book["author"])
            # Redundant if json_serial covers it
            if "publishDate" in book and isinstance(book["publishDate"], datetime.datetime):
                book["publishDate"] = book["publishDate"].strftime("%Y-%m-%d")

            if BOOK_COVERS_S3_BUCKET and book.get("coverImageS3Key"):
                try:
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': book["coverImageS3Key"]},
                        ExpiresIn=3600
                    )
                    book["coverImageUrl"] = presigned_url
                except Exception as e:
                    print(f"Error generating presigned URL for book {book['coverImageS3Key']}: {e}")
                    book["coverImageUrl"] = None

            print(f"Successfully fetched book: {book}")
            return make_response(200, book, event)
        else:
            print(f"Book with ID {book_id_str} not found.")
            return make_response(404, {"error": f"Book with id {book_id_str} not found"}, event)
    except ConnectionFailure as e:
        return make_response(500, {"error": str(e)}, event)
    except OperationFailure as e:
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)


def update_book_handler(event, context):
    """Handles PUT requests to /books/{bookId}."""
    try:
        current_db = _get_db()
        path_params = event.get("pathParameters")
        if not path_params or "bookId" not in path_params:
            return make_response(400, {"error": "Missing 'bookId' in path parameters"}, event)
        
        book_id_str = path_params["bookId"]
        
        body = event.get("body")
        if not body:
            return make_response(400, {"error": "Missing request body"}, event)
        
        update_data = json.loads(body)

        # Validate only fields that are present
        validation_errors = _validate_book_data(update_data, is_update=True)
        if validation_errors:
            return make_response(400, {"error": "Validation failed", "details": validation_errors}, event)

        try:
            book_oid = ObjectId(book_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid bookId format"}, event)

        # Handle cover image update/deletion
        new_cover_image_base64 = update_data.pop("coverImageBase64", None) # Use None as sentinel for no change
        s3_key_to_update = None
        delete_existing_s3_key = None
        set_s3_key_to_null = False

        if BOOK_COVERS_S3_BUCKET:
            # Fetch existing book to check for old S3 key if image is changing or being deleted
            if new_cover_image_base64 is not None: # This means image field was present in request
                existing_book = current_db.books.find_one({"_id": book_oid}, {"coverImageS3Key": 1})
                if existing_book and existing_book.get("coverImageS3Key"):
                    delete_existing_s3_key = existing_book["coverImageS3Key"]

                if new_cover_image_base64 == "": # Signal to delete image
                    print(f"Request to delete cover image for book {book_id_str}")
                    set_s3_key_to_null = True
                    if delete_existing_s3_key: # If there was an image to delete
                         s3_key_to_update = None # Ensure no new key is set
                    # Deletion of S3 object happens after DB check below
                elif new_cover_image_base64: # New image data provided
                    try:
                        image_data = base64.b64decode(new_cover_image_base64)
                        s3_object_key = f"covers/{book_id_str}/{uuid.uuid4()}.jpg" # Key per book, unique file
                        s3_client.put_object(
                            Bucket=BOOK_COVERS_S3_BUCKET, 
                            Key=s3_object_key, 
                            Body=image_data,
                            ContentType='image/jpeg'
                        )
                        s3_key_to_update = s3_object_key
                        print(f"Successfully uploaded new cover image to S3: {s3_key_to_update}")
                    except base64.binascii.Error as e:
                        print(f"Invalid base64 data for new cover image: {e}")
                        return make_response(400, {"error": "Invalid base64 for coverImageBase64"}, event)
                    except Exception as e:
                        print(f"Error uploading new cover image to S3: {e}")
                        # Potentially return 500, or just log and continue without image update
                        return make_response(500, {"error": "Failed to upload new cover image.", "details": str(e)}, event)
            
            # If a new image was uploaded and there was an old one, or if delete was signaled for an existing image
            if delete_existing_s3_key and (s3_key_to_update or set_s3_key_to_null):
                if s3_key_to_update != delete_existing_s3_key: # Don't delete if it's the same key (should not happen with UUIDs)
                    try:
                        print(f"Deleting old S3 object: {delete_existing_s3_key}")
                        s3_client.delete_object(Bucket=BOOK_COVERS_S3_BUCKET, Key=delete_existing_s3_key)
                        print(f"Successfully deleted S3 object: {delete_existing_s3_key}")
                    except Exception as e:
                        print(f"Error deleting old S3 object {delete_existing_s3_key}: {e}") # Log and continue
        
        if s3_key_to_update:
            update_data["coverImageS3Key"] = s3_key_to_update
        elif set_s3_key_to_null:
            update_data["coverImageS3Key"] = None # Or use $unset in MongoDB update if preferred

        print(f"Attempting to update book with ID: {book_id_str} with data: {update_data}")

        if not update_data: # If only coverImageBase64 was sent and it was popped.
            # Or if image handling resulted in no actual DB fields to update
            # We might still need to update if only coverImageS3Key was set to None
            if set_s3_key_to_null:
                 result = current_db.books.update_one({"_id": book_oid}, {"$set": {"coverImageS3Key": None}})
            else: # No actual DB update to perform other than potential S3 operations already done
                # Fetch and return the potentially modified book (e.g. if S3 key changed)
                updated_book = current_db.books.find_one({"_id": book_oid})
                if updated_book:
                    updated_book["_id"] = str(updated_book["_id"])
                    if BOOK_COVERS_S3_BUCKET and updated_book.get("coverImageS3Key"):
                        try:
                            presigned_url = s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': updated_book["coverImageS3Key"]},
                                ExpiresIn=3600
                            )
                            updated_book["coverImageUrl"] = presigned_url
                        except Exception as e:
                            print(f"Error generating presigned URL: {e}")
                    return make_response(200, {"message": "Book image processed, no other fields updated.", "book": updated_book}, event)
                else:
                    return make_response(404, {"error": f"Book with id {book_id_str} not found"}, event)

        result = current_db.books.update_one({"_id": book_oid}, {"$set": update_data})

        if result.matched_count == 0:
            return make_response(404, {"error": f"Book with id {book_id_str} not found"}, event)
        
        if result.modified_count == 0:
            # Could mean data was the same, or some fields weren't actual updates to stored values
             return make_response(200, {"message": "Book found, but no changes applied or data was the same.", "book_id": book_id_str}, event)


        # Fetch the updated book to return it
        updated_book = current_db.books.find_one({"_id": book_oid})
        if updated_book:
            updated_book["_id"] = str(updated_book["_id"])
            if "author" in updated_book and isinstance(updated_book["author"], ObjectId):
                 updated_book["author"] = str(updated_book["author"])
            if "publishDate" in updated_book and isinstance(updated_book["publishDate"], datetime.datetime):
                updated_book["publishDate"] = updated_book["publishDate"].strftime("%Y-%m-%d")

            if BOOK_COVERS_S3_BUCKET and updated_book.get("coverImageS3Key"):
                try:
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': updated_book["coverImageS3Key"]},
                        ExpiresIn=3600
                    )
                    updated_book["coverImageUrl"] = presigned_url
                except Exception as e:
                    print(f"Error generating presigned URL for updated book {updated_book.get('coverImageS3Key')}: {e}")
                    updated_book["coverImageUrl"] = None

        print(f"Successfully updated book with ID: {book_id_str}")
        return make_response(200, {"message": "Book updated successfully", "book": updated_book}, event)
    except ConnectionFailure as e:
        return make_response(500, {"error": str(e)}, event)
    except json.JSONDecodeError:
        return make_response(400, {"error": "Invalid JSON in request body"}, event)
    except OperationFailure as e:
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)


def delete_book_handler(event, context):
    """Handles DELETE requests to /books/{bookId}."""
    try:
        current_db = _get_db()
        path_params = event.get("pathParameters")
        if not path_params or "bookId" not in path_params:
            return make_response(400, {"error": "Missing 'bookId' in path parameters"}, event)
        
        book_id_str = path_params["bookId"]
        print(f"Attempting to delete book with ID: {book_id_str}")

        try:
            book_oid = ObjectId(book_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid bookId format"}, event)

        # Before deleting from DB, check if there's an S3 object to delete
        if BOOK_COVERS_S3_BUCKET:
            book_to_delete = current_db.books.find_one({"_id": book_oid}, {"coverImageS3Key": 1})
            if book_to_delete and book_to_delete.get("coverImageS3Key"):
                s3_key_to_delete = book_to_delete["coverImageS3Key"]
                try:
                    print(f"Deleting S3 object: {s3_key_to_delete} for book {book_id_str}")
                    s3_client.delete_object(Bucket=BOOK_COVERS_S3_BUCKET, Key=s3_key_to_delete)
                    print(f"Successfully deleted S3 object: {s3_key_to_delete}")
                except Exception as e:
                    print(f"Error deleting S3 object {s3_key_to_delete}: {e}")
                    # Log error but proceed with DB deletion anyway, or decide on stricter error handling
            
        result = current_db.books.delete_one({"_id": book_oid})

        if result.deleted_count == 1:
            print(f"Successfully deleted book with ID: {book_id_str}")
            return make_response(200, {"message": f"Book with id {book_id_str} deleted successfully"}, event)
        else: # result.deleted_count == 0
            print(f"Book with ID {book_id_str} not found for deletion.")
            return make_response(404, {"error": f"Book with id {book_id_str} not found"}, event)
    except ConnectionFailure as e:
        return make_response(500, {"error": str(e)}, event)
    except OperationFailure as e:
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

def get_cover_upload_url_handler(event, context):
    """Handles GET requests to /books/{bookId}/cover-upload-url to generate a pre-signed S3 PUT URL for cover image upload."""
    try:
        current_db = _get_db()
        path_params = event.get("pathParameters")
        if not path_params or "bookId" not in path_params:
            return make_response(400, {"error": "Missing 'bookId' in path parameters"}, event)
        book_id_str = path_params["bookId"]
        try:
            book_oid = ObjectId(book_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid bookId format"}, event)
        # Check if book exists
        book = current_db.books.find_one({"_id": book_oid})
        if not book:
            return make_response(404, {"error": f"Book with id {book_id_str} not found"}, event)
        if not BOOK_COVERS_S3_BUCKET:
            return make_response(500, {"error": "S3 bucket not configured"}, event)
        # Generate S3 key for the cover image
        s3_key = f"covers/{book_id_str}/upload.jpg"
        try:
            upload_url = s3_client.generate_presigned_url(
                'put_object',
                Params={'Bucket': BOOK_COVERS_S3_BUCKET, 'Key': s3_key, 'ContentType': 'image/jpeg'},
                ExpiresIn=600  # 10 minutes
            )
        except Exception as e:
            return make_response(500, {"error": "Failed to generate presigned URL", "details": str(e)}, event)
        return make_response(200, {"uploadUrl": upload_url, "coverImageS3Key": s3_key}, event)
    except Exception as e:
        return make_response(500, {"error": "Unexpected server error", "details": str(e)}, event)

def options_handler(event, context):
    allowed_origins = [
        "http://localhost:3000",
        "https://bookapp.stanleyluong.com"
    ]
    origin = None
    if event and "headers" in event and "origin" in event["headers"]:
        req_origin = event["headers"]["origin"]
        if req_origin in allowed_origins:
            origin = req_origin
    if not origin:
        origin = "http://localhost:3000"
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
        },
        "body": ""
    } 