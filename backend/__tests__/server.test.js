const request = require('supertest');
const app = require('../server');  

describe('GET /dados', () => {
  it('deve retornar 200 e arrays', async () => {
    const res = await request(app).get('/dados');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('temperatura');
    expect(res.body).toHaveProperty('vibracao');
  });
});