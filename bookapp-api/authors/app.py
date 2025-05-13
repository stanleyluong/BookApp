import json
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from bson import ObjectId # Import ObjectId
from bson.errors import InvalidId # Import InvalidId for error handling

# Initialize MongoDB client outside the handler for connection reuse
# Only attempt to connect if MONGODB_URI is set
MONGODB_URI = os.environ.get("MONGODB_URI")
client = None
db = None

if MONGODB_URI:
    try:
        print("Attempting to connect to MongoDB Atlas...")
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000) # 5 second timeout
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster') 
        # Get the database (replace 'your_db_name' with your actual database name)
        # You might want to extract the DB name from the URI or set another env var
        db_name = MONGODB_URI.split('/')[-1].split('?')[0] if '/' in MONGODB_URI else "BookApp" # Basic way to get DB name
        db = client[db_name] 
        print(f"Successfully connected to MongoDB Atlas, database: {db_name}")
    except ConnectionFailure as e:
        print(f"MongoDB connection failed: {e}")
        client = None # Ensure client is None if connection failed
        db = None
    except Exception as e: # Catch other potential errors like invalid URI format
        print(f"An error occurred during MongoDB client initialization: {e}")
        client = None
        db = None
else:
    print("MONGODB_URI environment variable not set. Skipping MongoDB connection.")

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

def get_authors_handler(event, context):
    """Handles GET requests to /authors"""

    if db is None: # Corrected check: If db connection failed or URI wasn't set
        print("MongoDB not available. Returning error.")
        return make_response(500, {"error": "Database connection failed or not configured."}, event)

    try:
        print("Fetching authors from MongoDB.")
        # Assuming you have an 'authors' collection
        # Convert ObjectId to string if necessary for JSON serialization
        authors_cursor = db.authors.find({})
        authors_list = []
        for author in authors_cursor:
            author["_id"] = str(author["_id"]) # Convert ObjectId to string
            authors_list.append(author)
        
        print(f"Successfully fetched {len(authors_list)} authors.")

        return make_response(200, {"authors": authors_list}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

# For local testing (optional)
# if __name__ == "__main__":
#     # You would need to set MONGODB_URI in your local environment to test this
#     if MONGODB_URI:
#         print(get_authors_handler({}, None))
#     else:
#         print("Set MONGODB_URI environment variable to test locally.") 


def create_author_handler(event, context):
    """Handles POST requests to /authors to create a new author."""
    if db is None:
        print("MongoDB not available. Returning error.")
        return make_response(500, {"error": "Database connection failed or not configured."}, event)

    try:
        body = event.get("body")
        if not body:
            return make_response(400, {"error": "Missing request body"}, event)
        
        author_data = json.loads(body)
        name = author_data.get("name")

        if not name:
            return make_response(400, {"error": "Missing 'name' in request body"}, event)

        # Simple validation: ensure name is a string
        if not isinstance(name, str):
            return make_response(400, {"error": "'name' must be a string"}, event)

        print(f"Attempting to create author with name: {name}")
        
        # Check if author already exists (optional, depends on requirements)
        existing_author = db.authors.find_one({"name": name})
        if existing_author:
            return make_response(409, {"error": f"Author with name '{name}' already exists.", "author_id": str(existing_author["_id"])}, event)

        result = db.authors.insert_one({"name": name})
        new_author_id = str(result.inserted_id)
        
        print(f"Successfully created author with ID: {new_author_id}")

        return make_response(201, {"message": "Author created successfully", "author_id": new_author_id, "name": name}, event)
    except json.JSONDecodeError:
        return make_response(400, {"error": "Invalid JSON in request body"}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

def get_author_by_id_handler(event, context):
    """Handles GET requests to /authors/{authorId}."""
    if db is None:
        print("MongoDB not available. Returning error.")
        return make_response(500, {"error": "Database connection failed or not configured."}, event)

    try:
        path_params = event.get("pathParameters")
        if not path_params or "authorId" not in path_params:
            return make_response(400, {"error": "Missing 'authorId' in path parameters"}, event)
        
        author_id_str = path_params["authorId"]
        print(f"Attempting to fetch author with ID: {author_id_str}")

        try:
            author_oid = ObjectId(author_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid authorId format"}, event)

        author = db.authors.find_one({"_id": author_oid})

        if author:
            author["_id"] = str(author["_id"]) # Convert ObjectId to string
            print(f"Successfully fetched author: {author}")
            return make_response(200, author, event)
        else:
            print(f"Author with ID {author_id_str} not found.")
            return make_response(404, {"error": f"Author with id {author_id_str} not found"}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

def update_author_handler(event, context):
    """Handles PUT requests to /authors/{authorId}."""
    if db is None:
        print("MongoDB not available. Returning error.")
        return make_response(500, {"error": "Database connection failed or not configured."}, event)

    try:
        path_params = event.get("pathParameters")
        if not path_params or "authorId" not in path_params:
            return make_response(400, {"error": "Missing 'authorId' in path parameters"}, event)
        
        author_id_str = path_params["authorId"]
        
        body = event.get("body")
        if not body:
            return make_response(400, {"error": "Missing request body"}, event)
        
        update_data = json.loads(body)
        new_name = update_data.get("name")

        if not new_name:
            return make_response(400, {"error": "Missing 'name' in request body for update"}, event)
        
        if not isinstance(new_name, str):
             return make_response(400, {"error": "'name' must be a string"}, event)


        print(f"Attempting to update author with ID: {author_id_str} to name: {new_name}")

        try:
            author_oid = ObjectId(author_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid authorId format"}, event)
        
        # Check if another author already has the new name (optional, to prevent duplicates)
        existing_author_with_new_name = db.authors.find_one({"name": new_name, "_id": {"$ne": author_oid}})
        if existing_author_with_new_name:
            return make_response(409, {"error": f"Another author with name '{new_name}' already exists."}, event)

        result = db.authors.update_one(
            {"_id": author_oid},
            {"$set": {"name": new_name}}
        )

        if result.matched_count == 0:
            print(f"Author with ID {author_id_str} not found for update.")
            return make_response(404, {"error": f"Author with id {author_id_str} not found"}, event)
        
        if result.modified_count == 0 and result.matched_count == 1:
             # This means the author was found, but the new name is the same as the old one
            print(f"Author {author_id_str} found, but no changes applied (name was already '{new_name}').")
            return make_response(200, {"message": "Author found, but no changes applied (name was already the same).", "author_id": author_id_str, "name": new_name}, event)
            
        print(f"Successfully updated author with ID: {author_id_str}")
        return make_response(200, {"message": "Author updated successfully", "author_id": author_id_str, "new_name": new_name}, event)
    except json.JSONDecodeError:
        return make_response(400, {"error": "Invalid JSON in request body"}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

def delete_author_handler(event, context):
    """Handles DELETE requests to /authors/{authorId}."""
    if db is None:
        print("MongoDB not available. Returning error.")
        return make_response(500, {"error": "Database connection failed or not configured."}, event)

    try:
        path_params = event.get("pathParameters")
        if not path_params or "authorId" not in path_params:
            return make_response(400, {"error": "Missing 'authorId' in path parameters"}, event)
        
        author_id_str = path_params["authorId"]
        print(f"Attempting to delete author with ID: {author_id_str}")

        try:
            author_oid = ObjectId(author_id_str)
        except InvalidId:
            return make_response(400, {"error": "Invalid authorId format"}, event)

        # Optional: Check if the author has associated books before deleting
        # This would require access to the 'books' collection and knowledge of its schema
        # books_count = db.books.count_documents({"authorId": author_oid}) # Assuming 'authorId' field in books
        # if books_count > 0:
        #     return {
        #         "statusCode": 409, # Conflict
        #         "headers": {"Content-Type": "application/json"},
        #         "body": json.dumps({"error": f"Cannot delete author with ID {author_id_str} because they have associated books."})
        #     }

        result = db.authors.delete_one({"_id": author_oid})

        if result.deleted_count == 1:
            print(f"Successfully deleted author with ID: {author_id_str}")
            return make_response(200, {"message": f"Author with id {author_id_str} deleted successfully"}, event)
        else:
            print(f"Author with ID {author_id_str} not found for deletion.")
            return make_response(404, {"error": f"Author with id {author_id_str} not found"}, event)
    except OperationFailure as e:
        print(f"MongoDB operation failed: {e}")
        return make_response(500, {"error": "Database operation failed.", "details": str(e)}, event)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return make_response(500, {"error": "An unexpected server error occurred.", "details": str(e)}, event)

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