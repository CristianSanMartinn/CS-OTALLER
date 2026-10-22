import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuthUser } from '../auth/auth.types.js';
import { bodyObject, text, uuid } from '../common/validation.js';

export interface PresenceRecord {
  userId: string;
  workshopId: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISABLED';
  lastSeenAt: string | null;
}

@Injectable()
export class PresenceService {
  constructor(private readonly db: DatabaseService) {}

  async snapshot(user: AuthUser): Promise<PresenceRecord[]> {
    const result = await this.db.query(`
      SELECT u.id, u.workshop_id, u.last_seen_at,
        CASE WHEN NOT u.active THEN 'DISABLED'
          WHEN EXISTS (SELECT 1 FROM user_presence p
            WHERE p.user_id=u.id AND p.workshop_id=u.workshop_id
              AND p.disconnected_at IS NULL
              AND p.last_seen_at > now() - interval '90 seconds') THEN 'ONLINE'
          ELSE 'OFFLINE' END AS status
      FROM users u WHERE u.workshop_id=$1
        AND ($2::boolean OR u.id=$3) ORDER BY u.first_name,u.last_name
    `, [user.workshopId, user.role === 'ADMIN', user.id]);
    return result.rows.map(row => ({
      userId: row.id, workshopId: row.workshop_id, status: row.status,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    }));
  }

  async heartbeat(user: AuthUser, body: unknown) {
    const input = bodyObject(body, ['sessionId']);
    const sessionId = uuid(text(input, 'sessionId', 36, true));
    // The authenticated identity is the only source of workshop and user IDs.
    await this.db.query(`
      INSERT INTO user_presence(user_id,workshop_id,session_id,last_seen_at)
      VALUES($1,$2,$3,now())
      ON CONFLICT(user_id,session_id) DO UPDATE
        SET last_seen_at=now(),disconnected_at=NULL
        WHERE user_presence.workshop_id=EXCLUDED.workshop_id
    `, [user.id, user.workshopId, sessionId]);
    await this.db.query('UPDATE users SET last_seen_at=now() WHERE id=$1 AND workshop_id=$2 AND active', [user.id, user.workshopId]);
    await this.db.query("DELETE FROM user_presence WHERE user_id=$1 AND workshop_id=$2 AND last_seen_at < now() - interval '7 days'", [user.id, user.workshopId]);
    return this.snapshot(user);
  }

  async disconnect(user: AuthUser, body: unknown) {
    const input = bodyObject(body, ['sessionId']);
    const sessionId = uuid(text(input, 'sessionId', 36, true));
    await this.db.query(`UPDATE user_presence SET disconnected_at=now()
      WHERE user_id=$1 AND workshop_id=$2 AND session_id=$3`, [user.id, user.workshopId, sessionId]);
    return { status: 'ok' };
  }
}
