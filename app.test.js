const request = require('supertest');
const express = require('express');
const app = require('./app');

describe('Student List App', () => {

  describe('GET /', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
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

  describe('POST /addStudent', () => {
    it('should add a new student and redirect to /', async () => {
      const res = await request(app)
        .post('/addStudent')
        .send('name=John Doe&dob=2002-01-01&contact=90001111')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(302); // redirect
      expect(res.headers.location).toBe('/');
    });

    it('should return 400 if missing fields', async () => {
      const res = await request(app)
        .post('/addStudent')
        .send('name=&dob=&contact=')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /deleteStudent/:id', () => {
    it('should delete student and redirect to /', async () => {
      const res = await request(app).post('/deleteStudent/1');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/');
    });
  });

});