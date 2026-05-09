import type { User } from './types';

export const readLS = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

export const writeLS = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const seedDemoUser = () => {
  const users = readLS<User[]>('users', []);
  if (!users.some((u) => u.email === 'demo@test.com')) {
    users.push({
      id: 'demo-user',
      name: 'Demo 會員',
      email: 'demo@test.com',
      password: 'demo123',
      phone: '0912-345-678',
    });
    writeLS('users', users);
  }
};
