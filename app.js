const express = require('express');
const app = express();

// View engine
app.set('view engine', 'ejs');

// Static and form handling
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

let students = [
  { studentId: 1, name: 'Peter Tan', dob: '2000-05-10', contact: '91234567', image: 'img1.jpg' },
  { studentId: 2, name: 'Mary Lee', dob: '2001-07-12', contact: '98765432', image: 'img2.jpg' },
];

// Display all students
app.get('/', (req, res) => {
  res.render('index', { student: students });
});

// Display a single student
app.get('/student/:id', (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((s) => s.studentId === studentId);

  if (student) {
    res.render('student', { student });
  } else {
    res.status(404).send('Student not found');
  }
});

// Show Add Student form
app.get('/addStudent', (req, res) => {
  res.render('addStudent');
});

// Handle Add Student form submission
app.post('/addStudent', (req, res) => {
  const { name, dob, contact, image } = req.body;

  if (!name || !dob || !contact || !image) {
    return res.status(400).send('All fields are required.');
  }

  const newId = students.length > 0 ? Math.max(...students.map((s) => s.studentId)) + 1 : 1;
  students.push({ studentId: newId, name, dob, contact, image });
  res.redirect('/');
});

// Delete a student
app.post('/deleteStudent/:id', (req, res) => {
  const studentId = parseInt(req.params.id);
  students = students.filter((s) => s.studentId !== studentId);
  res.redirect('/');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running at: http://localhost:${PORT}/`)
);