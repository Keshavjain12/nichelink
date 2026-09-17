import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Notification, Project, ProjectInterest } from '../src/models/index.js';
import { createProject } from './fixtures.js';
import { bearer, buildApp, createAdmin, createFreeUser, createProUser } from './helpers.js';

const projectBody = {
  title: 'AI meeting-notes summarizer',
  summary: 'Weekend side project looking for a frontend partner',
  description:
    'A privacy-first desktop app that turns meeting recordings into searchable summaries.',
  requiredSkills: ['React', 'Electron', 'react'],
  projectType: 'side-project',
  commitment: 'few-hours-week',
  compensation: 'equity',
  remote: true,
};

describe('projects API', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  it('requires authentication to browse', async () => {
    await request(app).get('/api/v1/projects').expect(401);
  });

  it('only allows Pro members to create collaboration requests', async () => {
    const free = await createFreeUser();
    const pro = await createProUser();

    const denied = await request(app)
      .post('/api/v1/projects')
      .set(bearer(free))
      .send(projectBody)
      .expect(403);
    expect(denied.body.code).toBe('PRO_REQUIRED');

    const res = await request(app)
      .post('/api/v1/projects')
      .set(bearer(pro))
      .send(projectBody)
      .expect(201);
    expect(res.body.data).toMatchObject({
      title: 'AI meeting-notes summarizer',
      requiredSkills: ['React', 'Electron'],
      status: 'open',
      viewer: { isAuthor: true, canEdit: true },
    });
  });

  it('filters by skill (case-insensitive), type and free-text search', async () => {
    const author = await createProUser();
    const viewer = await createFreeUser();
    await createProject({ author });
    await createProject({
      author,
      title: 'Rust database engine',
      requiredSkills: ['Rust'],
      projectType: 'startup',
    });

    const bySkill = await request(app)
      .get('/api/v1/projects?skills=typescript')
      .set(bearer(viewer))
      .expect(200);
    expect(bySkill.body.data.map((project) => project.title)).toEqual([
      'Open-source changelog generator',
    ]);

    const byType = await request(app)
      .get('/api/v1/projects?projectType=startup')
      .set(bearer(viewer))
      .expect(200);
    expect(byType.body.data).toHaveLength(1);

    const byText = await request(app)
      .get('/api/v1/projects?q=database')
      .set(bearer(viewer))
      .expect(200);
    expect(byText.body.data[0].title).toBe('Rust database engine');
  });

  it('prevents non-authors from editing or deleting, lets admins delete', async () => {
    const author = await createProUser();
    const otherPro = await createProUser();
    const admin = await createAdmin();
    const project = await createProject({ author });
    const second = await createProject({ author });

    await request(app)
      .patch(`/api/v1/projects/${project._id}`)
      .set(bearer(otherPro))
      .send({ status: 'closed' })
      .expect(403);
    await request(app).delete(`/api/v1/projects/${project._id}`).set(bearer(otherPro)).expect(403);

    await request(app)
      .patch(`/api/v1/projects/${project._id}`)
      .set(bearer(author))
      .send({ status: 'closed' })
      .expect(200);
    await request(app).delete(`/api/v1/projects/${project._id}`).set(bearer(author)).expect(200);
    await request(app).delete(`/api/v1/projects/${second._id}`).set(bearer(admin)).expect(200);

    await request(app).get(`/api/v1/projects/${project._id}`).set(bearer(author)).expect(404);
  });

  it('handles the interest lifecycle with notifications and privacy', async () => {
    const author = await createProUser();
    const free = await createFreeUser();
    const snooper = await createProUser();
    const project = await createProject({ author });

    await request(app)
      .post(`/api/v1/projects/${project._id}/interests`)
      .set(bearer(author))
      .send({})
      .expect(400);

    const interest = await request(app)
      .post(`/api/v1/projects/${project._id}/interests`)
      .set(bearer(free))
      .send({ message: 'I maintain a similar CLI and would love to help.' })
      .expect(201);
    await request(app)
      .post(`/api/v1/projects/${project._id}/interests`)
      .set(bearer(free))
      .send({})
      .expect(409);

    expect((await Project.findById(project._id).lean()).interestCount).toBe(1);
    expect(
      await Notification.countDocuments({ recipient: author._id, type: 'project_interest' }),
    ).toBe(1);

    await request(app)
      .get(`/api/v1/projects/${project._id}/interests`)
      .set(bearer(snooper))
      .expect(403);
    const list = await request(app)
      .get(`/api/v1/projects/${project._id}/interests`)
      .set(bearer(author))
      .expect(200);
    expect(list.body.data[0].user.username).toBe(free.username);

    await request(app)
      .patch(`/api/v1/projects/${project._id}/interests/${interest.body.data.id}`)
      .set(bearer(snooper))
      .send({ status: 'accepted' })
      .expect(403);
    await request(app)
      .patch(`/api/v1/projects/${project._id}/interests/${interest.body.data.id}`)
      .set(bearer(author))
      .send({ status: 'accepted' })
      .expect(200);
    expect((await ProjectInterest.findById(interest.body.data.id).lean()).status).toBe('accepted');

    const detail = await request(app)
      .get(`/api/v1/projects/${project._id}`)
      .set(bearer(free))
      .expect(200);
    expect(detail.body.data.viewer).toMatchObject({
      interestStatus: 'accepted',
      canExpressInterest: false,
    });
  });
});
