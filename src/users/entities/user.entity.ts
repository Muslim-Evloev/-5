import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', default: 'user' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}