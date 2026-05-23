import pool from '../../database/client';

async function seedDemoData() {
  console.log('🌱 Seeding demo data...\n');

  // Clear existing data
  await pool.query('TRUNCATE TABLE health_alerts, reactions, message_metadata, users CASCADE');

  // Create 8 demo users with different patterns
  const users = [
    // 1. Healthy user
    { id: 'U_ALICE', name: 'alice', realName: 'Alice Chen', role: 'Engineer' },
    
    // 2. Burnout case (will be our prediction target)
    { id: 'U_SARAH', name: 'sarah', realName: 'Sarah Martinez', role: 'Product Manager' },
    
    // 3. Engagement drop
    { id: 'U_MIKE', name: 'mike', realName: 'Mike Johnson', role: 'Designer' },
    
    // 4. Silent tension
    { id: 'U_DAVID', name: 'david', realName: 'David Kim', role: 'Engineer' },
    
    // 5. Meeting overload
    { id: 'U_EMMA', name: 'emma', realName: 'Emma Wilson', role: 'Sales' },
    
    // 6-8. Healthy team members
    { id: 'U_JAMES', name: 'james', realName: 'James Brown', role: 'Engineer' },
    { id: 'U_LISA', name: 'lisa', realName: 'Lisa Davis', role: 'Marketing' },
    { id: 'U_RYAN', name: 'ryan', realName: 'Ryan Lee', role: 'Support' },
  ];

  // Insert users
  for (const user of users) {
    await pool.query(
      'INSERT INTO users (user_id, username, real_name) VALUES ($1, $2, $3)',
      [user.id, user.name, user.realName]
    );
  }
  console.log('✅ Created 8 demo users');

  const now = new Date();

  // ALICE: Healthy pattern (15 msgs/day, normal hours)
  console.log('📊 Generating Alice (healthy)...');
  for (let day = 0; day < 30; day++) {
    for (let msg = 0; msg < 15; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60)); // 9am-6pm
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_ALICE', 'C_GENERAL', date.getTime().toString(), date]
      );
    }
  }

  // SARAH: BURNOUT PATTERN - The star of our demo
  console.log('🔥 Generating Sarah (burnout - prediction target)...');
  
  // Weeks 4-3: Normal (20 msgs/day, normal hours)
  for (let day = 30; day >= 14; day--) {
    for (let msg = 0; msg < 20; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_SARAH', 'C_PRODUCT', date.getTime().toString(), date]
      );
    }
  }

  // Week 2: Starting to decline (15 msgs/day + some late nights)
  for (let day = 13; day >= 7; day--) {
    // Normal messages (reduced)
    for (let msg = 0; msg < 12; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_SARAH', 'C_PRODUCT', date.getTime().toString(), date]
      );
    }
    
    // Late night messages (3-4 per day)
    for (let msg = 0; msg < 3 + Math.floor(Math.random() * 2); msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(22 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60)); // 10pm-2am
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_SARAH', 'C_PRODUCT', date.getTime().toString(), date]
      );
    }
  }

  // THIS WEEK: CRITICAL - Severe decline
  for (let day = 6; day >= 0; day--) {
    // Very few normal messages (5/day)
    for (let msg = 0; msg < 5; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(10 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60)); // 10am-2pm only
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_SARAH', 'C_PRODUCT', date.getTime().toString(), date]
      );
    }
    
    // Heavy late-night work (6-8/day)
    for (let msg = 0; msg < 6 + Math.floor(Math.random() * 3); msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(22 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60)); // 10pm-3am
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_SARAH', 'C_PRODUCT', date.getTime().toString(), date]
      );
    }
  }

  // MIKE: Engagement drop (was active, now silent)
  console.log('📉 Generating Mike (engagement drop)...');
  
  // Previous 3 weeks: Very active (25 msgs/day)
  for (let day = 30; day >= 7; day--) {
    for (let msg = 0; msg < 25; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_MIKE', 'C_DESIGN', date.getTime().toString(), date]
      );
    }
  }

  // This week: Almost silent (3 msgs/day)
  for (let day = 6; day >= 0; day--) {
    for (let msg = 0; msg < 3; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_MIKE', 'C_DESIGN', date.getTime().toString(), date]
      );
    }
  }

  // DAVID: Silent tension (stopped collaborating in threads)
  console.log('🤐 Generating David (silent tension)...');
  
  // Previous weeks: Active in shared threads with Alice
  for (let day = 30; day >= 7; day--) {
    const threadTs = `${Date.now() - (day * 86400000)}.000`;
    
    // David and Alice collaborating
    for (let msg = 0; msg < 5; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + msg, Math.floor(Math.random() * 60));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, thread_ts) VALUES ($1, $2, $3, $4, $5)',
        ['U_DAVID', 'C_ENGINEERING', date.getTime().toString(), date, threadTs]
      );
    }
    
    // Alice in same threads
    for (let msg = 0; msg < 5; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + msg, 30 + Math.floor(Math.random() * 30));
      
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, thread_ts) VALUES ($1, $2, $3, $4, $5)',
        ['U_ALICE', 'C_ENGINEERING', date.getTime().toString(), date, threadTs]
      );
    }
  }

  // This week: David avoids threads, only solo messages
  for (let day = 6; day >= 0; day--) {
    for (let msg = 0; msg < 8; msg++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
      
      // No thread_ts = solo messages
      await pool.query(
        'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
        ['U_DAVID', 'C_ENGINEERING', date.getTime().toString(), date]
      );
    }
  }

  // EMMA, JAMES, LISA, RYAN: Healthy patterns (variety)
  console.log('✨ Generating healthy team members...');
  
  const healthyUsers = ['U_EMMA', 'U_JAMES', 'U_LISA', 'U_RYAN'];
  const channels = ['C_SALES', 'C_ENGINEERING', 'C_MARKETING', 'C_SUPPORT'];
  
  for (let i = 0; i < healthyUsers.length; i++) {
    for (let day = 0; day < 30; day++) {
      const msgCount = 12 + Math.floor(Math.random() * 8); // 12-20 msgs/day
      
      for (let msg = 0; msg < msgCount; msg++) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)); // 8am-6pm
        
        await pool.query(
          'INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts) VALUES ($1, $2, $3, $4)',
          [healthyUsers[i], channels[i], date.getTime().toString(), date]
        );
      }
    }
  }

  console.log('\n✅ Demo data seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('- Alice: Healthy baseline (450 messages)');
  console.log('- Sarah: BURNOUT TRAJECTORY (critical - 350 messages, 40+ late nights)');
  console.log('- Mike: Engagement drop (200 → 20 messages)');
  console.log('- David: Silent tension (stopped collaborating)');
  console.log('- Emma, James, Lisa, Ryan: Healthy team members');
  console.log('\n🎯 Sarah is your demo star - shows 4-week decline to resignation risk');

  const totalMessages = await pool.query('SELECT COUNT(*) FROM message_metadata');
  console.log(`\n📈 Total messages in database: ${totalMessages.rows[0].count}`);

  process.exit(0);
}

seedDemoData().catch(console.error);