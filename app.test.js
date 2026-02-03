const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Set test environment before requiring app
process.env.NODE_ENV = 'test';

const app = require('./app');

// Set the current working directory for the test
process.chdir(__dirname);

// Reset students data before all tests
const resetData = () => {
  const dataDir = path.join(__dirname, 'data');
  const studentsFile = path.join(dataDir, 'students.json');
  const defaultStudents = [
    { studentId: 1, name: 'Peter Tan', dob: '2000-05-10', contact: '91234567', avatar: 'https://via.placeholder.com/80' },
    { studentId: 2, name: 'Mary Lee', dob: '2001-07-12', contact: '98765432', avatar: 'https://via.placeholder.com/80' },
  ];
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(studentsFile, JSON.stringify(defaultStudents, null, 2));
  if (app.resetStudents) {
    app.resetStudents();
  }
};

describe('Student List App', () => {
  beforeEach(() => {
    resetData();
  });

  afterAll(() => {
    if (app.stopCleanupInterval) {
      app.stopCleanupInterval();
    }
  });

  describe('GET /', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
    });

    it('should return search results for existing name', async () => {
      const res = await request(app).get('/?search=Peter');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Peter Tan');
    });

    it('should show no results message for non-matching search', async () => {
      const res = await request(app).get('/?search=NobodyMatches');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('No students found');
    });

    it('should return results for case-insensitive search', async () => {
      const res = await request(app).get('/?search=peter');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Peter Tan');
    });

    it('should return results for partial search', async () => {
      const res = await request(app).get('/?search=pet');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Peter Tan');
    });
  });

  describe('GET /student/:id', () => {
    it('should return student detail when student exists', async () => {
      const res = await request(app).get('/student/1');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Peter Tan');
    });

    it('should return 404 when student does not exist', async () => {
      const res = await request(app).get('/student/999');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET forms', () => {
    it('GET /addStudent should render form', async () => {
      const res = await request(app).get('/addStudent');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Add New Student');
    });

    it('GET /editStudent/:id should render edit form for existing student', async () => {
      const res = await request(app).get('/editStudent/1');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Edit Student');
      expect(res.text).toContain('Peter Tan');
    });

    it('GET /editStudent/:id should return 404 for non-existent id', async () => {
      const res = await request(app).get('/editStudent/999');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /addStudent', () => {
    it('should add a new student and redirect to /, and show on list', async () => {
      const agent = request(app);
      const res = await agent
        .post('/addStudent')
        .send('name=John Doe&dob=2002-01-01&contact=90001111')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');

      const list = await agent.get('/');
      expect(list.statusCode).toBe(200);
      expect(list.text).toContain('John Doe');
    });

    it('should return 400 if missing fields', async () => {
      const res = await request(app)
        .post('/addStudent')
        .send('name=&dob=&contact=')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(400);
    });
  });

  describe('File uploads', () => {
    it('should upload avatar when adding student', async () => {
      const agent = request(app);
      // create a small temporary file to upload
      const tmpPath = path.join(__dirname, 'test-avatar.png');
      fs.writeFileSync(tmpPath, Buffer.from([0,1,2,3,4,5]));

      const res = await agent
        .post('/addStudent')
        .field('name', 'Avatar Kid')
        .field('dob', '2003-03-03')
        .field('contact', '90002222')
        .attach('avatar', tmpPath);

      // cleanup temp file
      try { fs.unlinkSync(tmpPath); } catch (e) {}

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');

      const list = await agent.get('/');
      expect(list.statusCode).toBe(200);
      expect(list.text).toContain('Avatar Kid');
      // avatar should be a local uploads path in the rendered HTML
      expect(list.text).toMatch(/uploads\//);
    });
  });

  describe('POST /editStudent/:id', () => {
    it('should return 400 if missing fields when editing', async () => {
      const res = await request(app)
        .post('/editStudent/1')
        .send('name=&dob=&contact=')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(400);
    });
    it('should update an existing student and redirect', async () => {
      const agent = request(app);
      const res = await agent
        .post('/editStudent/1')
        .send('name=Peter%20Updated&dob=2000-05-10&contact=91234567')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');

      const detail = await agent.get('/student/1');
      expect(detail.statusCode).toBe(200);
      expect(detail.text).toContain('Peter Updated');
    });
  });

  describe('POST /deleteStudent/:id', () => {
    it('should delete student and redirect to /', async () => {
      const res = await request(app).post('/deleteStudent/1');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');
    });

    it('deleting non-existent id should still redirect to /', async () => {
      const res = await request(app).post('/deleteStudent/999');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');
    });
  });

});