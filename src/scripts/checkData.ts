// src/scripts/checkData.ts
import mongoose from 'mongoose';
import Event from '../models/Event';

(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
  const events = await Event.find();
  console.log(events);
  process.exit();
})();
