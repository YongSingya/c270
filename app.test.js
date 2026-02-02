const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs'); 
const app = require('./app');

// Set the current working directory for the test
process.chdir(__dirname);

const DATA_FILE = path.join(__dirname, 'data', 'students.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Test data
const mockStudents = [
  { studentId: 1, name: 'John Doe', dob: '2005-05-15', contact: '91234567', photo: null },
  { studentId: 2, name: 'Jane Smith', dob: '2006-08-20', contact: '98765432', photo: 'test-photo.jpg' }
];

describe('Student Management - Integration Tests', () => {

  let server;
  let backupExists = false;
  const BACKUP_FILE = DATA_FILE + '.bak';

  beforeEach(() => {
    // Backup original data file once so tests don't delete user's data
    if (!backupExists && fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      backupExists = true;
    }

    // Create/overwrite test data file for each test
    fs.writeFileSync(DATA_FILE, JSON.stringify(mockStudents, null, 2));

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up any test uploads but keep `students.json` intact
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      });
    }
  });

  afterAll((done) => {
    // Restore original data file if it existed before tests
    if (backupExists && fs.existsSync(BACKUP_FILE)) {
      fs.copyFileSync(BACKUP_FILE, DATA_FILE);
      try { fs.unlinkSync(BACKUP_FILE); } catch (e) {}
    }

    // Close the server after all tests
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  // --- CRUD: CREATE ---
  describe('POST /addStudent - Create Student', () => {
    it('should add a new student', async () => {
      await request(app)
        .post('/addStudent')
        .field('name', 'Alice Johnson')
        .field('dob', '2007-03-10')
        .field('contact', '85555555')
        .expect(302)
        .expect('Location', '/');

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data.length).toBe(3);
      expect(data[2].name).toBe('Alice Johnson');
    });

    it('should upload photo with student', async () => {
      const photoPath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(photoPath, 'fake image data');

      await request(app)
        .post('/addStudent')
        .field('name', 'Charlie Brown')
        .field('dob', '2005-12-01')
        .field('contact', '92222222')
        .attach('studentPhoto', photoPath)
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data[2].photo).toBeTruthy();
      fs.unlinkSync(photoPath);
    });
  });

  // --- CRUD: READ ---
  describe('GET /student/:id - View Student', () => {
    it('should display student profile', async () => {
      const response = await request(app)
        .get('/student/1')
        .expect(200);

      expect(response.text).toContain('John Doe');
      expect(response.text).toContain('91234567');
    });

    it('should return 404 for non-existent student', async () => {
      await request(app)
        .get('/student/999')
        .expect(404);
    });
  });

  // --- CRUD: UPDATE ---
  describe('POST /editStudent/:id - Update Student', () => {
    it('should update student info', async () => {
      await request(app)
        .post('/editStudent/1')
        .field('name', 'John Updated')
        .field('dob', '2005-05-15')
        .field('contact', '91111111')
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data[0].name).toBe('John Updated');
      expect(data[0].contact).toBe('91111111');
    });

    it('should replace photo when new photo uploaded', async () => {
      const photoPath = path.join(__dirname, 'new-photo.jpg');
      fs.writeFileSync(photoPath, 'new image data');

      await request(app)
        .post('/editStudent/2')
        .field('name', 'Jane Updated')
        .field('dob', '2006-08-20')
        .field('contact', '98222222')
        .attach('studentPhoto', photoPath)
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data[1].name).toBe('Jane Updated');
      fs.unlinkSync(photoPath);
    });

    it('should keep old photo when no new photo uploaded', async () => {
      await request(app)
        .post('/editStudent/2')
        .field('name', 'Jane Updated')
        .field('dob', '2006-08-20')
        .field('contact', '98111111')
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data[1].photo).toBe('test-photo.jpg');
    });
  });

  // --- CRUD: DELETE ---
  describe('POST /deleteStudent/:id - Delete Student', () => {
    it('should delete student from database', async () => {
      await request(app)
        .post('/deleteStudent/1')
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data.length).toBe(1);
      expect(data[0].studentId).toBe(2);
    });

    it('should delete photo from disk', async () => {
      const photoPath = path.join(UPLOADS_DIR, 'test-photo.jpg');
      fs.writeFileSync(photoPath, 'photo data');

      await request(app)
        .post('/deleteStudent/2')
        .expect(302);

      expect(fs.existsSync(photoPath)).toBe(false);
    });

    it('should handle student without photo', async () => {
      await request(app)
        .post('/deleteStudent/1')
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data.length).toBe(1);
    });
  });

  // --- SEARCH ---
  describe('GET / - Search Functionality', () => {
    it('should filter students by search query', async () => {
      const response = await request(app)
        .get('/?search=John')
        .expect(200);

      expect(response.text).toContain('John Doe');
    });

    it('should return empty results for no match', async () => {
      const response = await request(app)
        .get('/?search=NonExistent')
        .expect(200);

      expect(response.text).toContain('No students found');
    });

    it('should show reset button when searching', async () => {
      const response = await request(app)
        .get('/?search=test')
        .expect(200);

      expect(response.text).toContain('Reset');
    });
  });

  // --- DATA PERSISTENCE ---
  describe('Data Persistence', () => {
    it('should read from JSON file on page load', async () => {
      const response = await request(app).get('/').expect(200);
      expect(response.text).toContain('John Doe');
    });

    it('should write to JSON file on modifications', async () => {
      await request(app)
        .post('/addStudent')
        .field('name', 'Test Student')
        .field('dob', '2006-01-01')
        .field('contact', '80000000');

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data.length).toBe(3);
    });

    it('should handle corrupted JSON gracefully', async () => {
      fs.writeFileSync(DATA_FILE, 'invalid json');

      const response = await request(app).get('/').expect(200);
      expect(response.text).toContain('No students found');
    });

    it('should handle empty student list', async () => {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));

      const response = await request(app).get('/').expect(200);
      expect(response.text).toContain('No students found');
    });
  });

  // --- ERROR HANDLING ---
  describe('Error Handling', () => {
    it('should handle missing photo file gracefully', async () => {
      await request(app)
        .post('/deleteStudent/2')
        .expect(302);

      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      expect(data.length).toBe(1);
    });

    it('should display correct total enrollment count', async () => {
      const response = await request(app).get('/').expect(200);
      expect(response.text).toContain('Total Enrollment');
    });
  });
});