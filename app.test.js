const request = require('supertest');
const express = require('express');
const path = require('path');
const app = require('./app');

// Set the current working directory for the test
process.chdir(__dirname);

describe('Student List App', () => {

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

  describe('POST /editStudent/:id', () => {
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