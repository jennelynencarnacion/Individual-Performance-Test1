const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3220;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Connect to MongoDB using mongoose
mongoose.connect('mongodb://localhost:27017/mongo-test')
  .then(() => {
    console.log('Connected to MongoDB');
    // After connecting to MongoDB, proceed with reading and inserting data
    insertCourses();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Course schema
const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  units: {
    type: Number,
    required: true
  },
  tags: {
    type: [String],
    required: true
  }
});

// Define the Course model based on the schema
const Course = mongoose.model('Course', courseSchema);

// Read and process curriculum data from the JSON file
const curriculumData = JSON.parse(fs.readFileSync('courses.json', 'utf8'));

// Flatten the curriculum data into an array of course objects
const courses = curriculumData.flatMap(year => Object.values(year)).flatMap(course => course);

// Function to insert courses into the MongoDB database
async function insertCourses() {
  try {
    // Check if courses data is an array
    if (!Array.isArray(courses)) {
      throw new Error('Invalid courses data format. Expected an array.');
    }
    
    // Validate each course object
    for (const course of courses) {
      if (
        typeof course.code !== 'string' ||
        typeof course.description !== 'string' ||
        typeof course.units !== 'number' ||
        !Array.isArray(course.tags) ||
        course.tags.some(tag => typeof tag !== 'string')
      ) {
        throw new Error('Invalid course data format.');
      }
    }

    await Course.deleteMany({}); // Clear existing data before inserting
    await Course.insertMany(courses);
    console.log('Courses inserted successfully');
  } catch (error) {
    console.error('Error inserting courses:', error);
  }
}

// Retrieve all published backend courses and sort them alphabetically by their names.
app.get('/backend-courses', async (req, res) => {
  try {
    const backendCourses = await Course.find({ tags: { $in: ['Programming', 'Database Management', 'Web Development'] } })
      .select('description tags')
      .sort({ description: 1 });

    res.json(backendCourses);
  } catch (error) {
    console.error('Error retrieving backend courses:', error);
    res.status(500).json({ error: 'Error retrieving backend courses' });
  }
});

// Retrieve published BSIS and BSIT courses
app.get('/bsis-bsit-courses', async (req, res) => {
  try {
    const bsisBsitCourses = await Course.find({ tags: { $in: ['BSIS', 'BSIT'] } })
      .select('description tags');

    res.json(bsisBsitCourses);
  } catch (error) {
    console.error('Error retrieving BSIS/BSIT courses:', error);
    res.status(500).json({ error: 'Error retrieving BSIS/BSIT courses' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
