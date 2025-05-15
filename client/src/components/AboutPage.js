import { Box, Divider, Link, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import React from 'react';

const AboutPage = () => {
  const techStack = [
    { category: 'Frontend', items: [
      { name: 'React', link: 'https://reactjs.org/' },
      { name: 'Material UI (MUI)', link: 'https://mui.com/' },
      { name: 'React Router', link: 'https://reactrouter.com/' },
    ]},
    { category: 'Backend', items: [
      { name: 'AWS Lambda (Python)', link: 'https://aws.amazon.com/lambda/' },
      { name: 'AWS API Gateway', link: 'https://aws.amazon.com/api-gateway/' },
      { name: 'AWS S3', description: 'For book cover image storage', link: 'https://aws.amazon.com/s3/' },
    ]},
    { category: 'Database', items: [
      { name: 'MongoDB Atlas', link: 'https://www.mongodb.com/cloud/atlas' },
    ]},
    { category: 'Deployment & Infrastructure', items: [
      { name: 'AWS Serverless Application Model (SAM)', link: 'https://aws.amazon.com/serverless/sam/' },
      { name: 'AWS Amplify', description: 'For CI/CD and hosting', link: 'https://aws.amazon.com/amplify/' },
    ]},
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', my: 4, p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          About BookApp
        </Typography>
        <Typography variant="body1" paragraph>
          BookApp is a modern library management application designed to help users effortlessly manage their books and authors. 
          It features a clean, intuitive interface for adding, editing, and exploring a book collection.
        </Typography>
        
        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
          Technology Stack
        </Typography>
        <Typography variant="body1" paragraph>
          This application is built using a variety of modern technologies:
        </Typography>

        {techStack.map((categoryObj) => (
          <Box key={categoryObj.category} sx={{ mb: 3 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {categoryObj.category}
            </Typography>
            <List dense>
              {categoryObj.items.map((item) => (
                <ListItem key={item.name} disableGutters>
                  <ListItemText 
                    primary={item.link ? <Link href={item.link} target="_blank" rel="noopener">{item.name}</Link> : item.name}
                    secondary={item.description}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          Developed with care and passion for good books and software.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AboutPage; 