-- Insert some late-night messages for testing
INSERT INTO message_metadata (user_id, channel_id, timestamp, message_ts, is_thread_reply)
VALUES 
  ('U0B58TXD0N7', 'C0B5D7B4GJJ', '1234567890.123', '2026-05-20 23:30:00', false),
  ('U0B58TXD0N7', 'C0B5D7B4GJJ', '1234567891.123', '2026-05-21 00:15:00', false),
  ('U0B58TXD0N7', 'C0B5D7B4GJJ', '1234567892.123', '2026-05-21 01:20:00', false),
  ('U0B58TXD0N7', 'C0B5D7B4GJJ', '1234567893.123', '2026-05-22 23:45:00', false),
  ('U0B58TXD0N7', 'C0B5D7B4GJJ', '1234567894.123', '2026-05-23 02:00:00', false);