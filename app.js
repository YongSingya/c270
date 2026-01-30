const express = require('express');
const app = express();
exports.app = app;

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

let students = [
  { studentId: 1, name: 'Peter Tan', dob: '2000-05-10', contact: '91234567' },
  { studentId: 2, name: 'Mary Lee', dob: '2001-07-12', contact: '98765432' },
];

// Home Page with search
app.get('/', (req, res) => {
  const keyword = req.query.search;
  let filtered = students;

  if (keyword) {
    filtered = students.filter(s =>
      s.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  res.render('index', { students: filtered, search: keyword || '' });
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
  const { name, dob, contact } = req.body;

  if (!name || !dob || !contact) {
    return res.status(400).send('All fields are required.');
  }

  const newId = students.length > 0 ? Math.max(...students.map((s) => s.studentId)) + 1 : 1;
  students.push({ studentId: newId, name, dob, contact });
  res.redirect('/');
});

// Show Edit Student form
app.get("/editStudent/:id", (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((s) => s.studentId === studentId);

  if (!student) {
    return res.status(404).send("Student not found");
  }

  res.render("editStudent", { student });
});

// Handle Edit Student form submission
app.post("/editStudent/:id", (req, res) => {
  const studentId = parseInt(req.params.id);
  const { name, dob, contact } = req.body;

  const idx = students.findIndex((s) => s.studentId === studentId);
  if (idx === -1) {
    return res.status(404).send("Student not found");
  }

  students[idx] = { studentId, name, dob, contact };
  res.redirect("/");
});

// Delete a student
app.post('/deleteStudent/:id', (req, res) => {
  const studentId = parseInt(req.params.id);
  students = students.filter((s) => s.studentId !== studentId);
  res.redirect('/');
});

// Start the server
const PORT = process.env.PORT || 3000;

if (require.main == module){
  app.listen(PORT, () =>
    console.log(`Server running at: http://localhost:${PORT}/`)
);
}

module.exports = app;
