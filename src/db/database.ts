import Dexie, { type Table } from 'dexie';
import type { User, Trip, Achievement, Feedback, FriendRequest } from '../types/models';

export interface SystemSetting {
  key: string;
  value: any;
}

export class JeuDuTrainDB extends Dexie {
  users!: Table<User, number>;
  trips!: Table<Trip, number>;
  achievements!: Table<Achievement, number>;
  feedback!: Table<Feedback, number>;
  friendRequests!: Table<FriendRequest, number>;
  settings!: Table<SystemSetting, string>;

  constructor() {
    super('JeuDuTrainDB');
    
    // Define schema (indexes)
    this.version(3).stores({
      users: '++id, &username, points', // Primary key and indexed props
      trips: '++id, userId, date',
      achievements: '++id, userId, achievementId, [userId+achievementId]',
      feedback: '++id, userId, status, type, createdAt',
      friendRequests: '++id, senderId, receiverId, status, [senderId+receiverId]',
      settings: '&key'
    });
  }
}

export const db = new JeuDuTrainDB();
