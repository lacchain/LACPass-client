import { Column, Entity } from 'typeorm';
import { Base } from './base.entity';
@Entity()
export class Did extends Base {
  @Column({ unique: true })
  did!: string;

  @Column({ unique: true })
  keyId?: string;
}
