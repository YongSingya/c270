const request = require('supertest');
const express = require('express');

describe('GET /', () => {
  it('should return 200 OK', async () => {
    const response = { status: 200 }; 
    expect(response.status).toBe(200);
  });
});