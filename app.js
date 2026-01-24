const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

let students = [
  { studentId: 1, name: 'Peter Tan', dob: '2000-05-10', contact: '91234567' },
  { studentId: 2, name: 'Mary Lee', dob: '2001-07-12', contact: '98765432' },
];

// Home Page
app.get("/", (req, res) => {
  const keyword = req.query.search;
  let filtered = students;

  if (keyword) {
    filtered = students.filter(s =>
      s.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  res.render("index", { students: filtered, search: keyword || "" });
});

// Student Profile
app.get('/student/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find(s => s.studentId === id);
  if (!student) return res.status(404).send("Student not found");

  res.render("student", { student });
});

// Add Student form
app.get('/addStudent', (req, res) => {
  res.render("addStudent");
});

// Add Student submit
app.post("/addStudent", (req, res) => {
  const { name, dob, contact } = req.body;
  const id = students.length > 0 ? Math.max(...students.map(s => s.studentId)) + 1 : 1;

  students.push({ studentId: id, name, dob, contact });
  res.redirect("/");
});

// Delete student
app.post("/deleteStudent/:id", (req, res) => {
  const id = parseInt(req.params.id);
  students = students.filter(s => s.studentId !== id);
  res.redirect("/");
});

app.listen(3000, () => console.log("Running at http://localhost:3000"));