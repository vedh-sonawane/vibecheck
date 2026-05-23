import pool from '../../database/client';

async function generateTestData() {
  console.log('Generating test data...');

  const users = [
    { id: 'U001', name: 'alice', realName: 'Alice Chen' },
    { id: 'U002', name: 'bob', realName: 'Bob Johnson' },
    { id: 'U003', name: 'charlie', realName: 'Charlie Smith' },
  ];

  for (const user of users) {
    await pool.query(
      'INSERT INTO users (user_id, username, real_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [user.id, user.name, user.realName]
    );
  }

  const now = new Date();

  // Alice: Healthy pattern (9am-6pm)
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    for (let j = 0; j < 15; j++) {
      date.setHours(9 + Math.floor(Math.random() * 9));
      await pool.query(
        `INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, is_thread_reply) VALUES ($1, $2, $3, $4, false)`,
        ['U001', 'C001', date.getTime().toString(), date]
      );
    }
  }

  // Bob: Burnout pattern (late night)
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    for (let j = 0; j < 10; j++) {
      date.setHours(22 + Math.floor(Math.random() * 4));
      await pool.query(
        `INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, is_thread_reply) VALUES ($1, $2, $3, $4, false)`,
        ['U002', 'C001', date.getTime().toString(), date]
      );
    }
  }

  // Charlie: Declining engagement
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const messageCount = Math.max(1, 20 - i);
    for (let j = 0; j < messageCount; j++) {
      date.setHours(10 + Math.floor(Math.random() * 6));
      await pool.query(
        `INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, is_thread_reply) VALUES ($1, $2, $3, $4, false)`,
        ['U003', 'C001', date.getTime().toString(), date]
      );
    }
  }

  console.log('✅ Test data generated!');
  process.exit(0);
}

generateTestData();