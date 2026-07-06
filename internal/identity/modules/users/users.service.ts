// src/modules/users/users.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { UsersRepository, UserRecord } from './users.repository';

/**
 * Service métier pour les utilisateurs. Il encapsule l'accès au repository
 * et applique la logique applicative si nécessaire.
 */
export class UsersService {
  private repo: UsersRepository;

  constructor(private supabase: SupabaseClient) {
    this.repo = new UsersRepository(supabase);
  }

  /**
   * Récupère un utilisateur par son ID.
   */
  async getUserById(id: string): Promise<UserRecord | null> {
    try {
      return await this.repo.getById(id);
    } catch (err) {
      throw new Error(`Failed to get user by id=${id}: ${(err as Error).message}`);
    }
  }

  /**
   * Liste les utilisateurs avec pagination et filtre optionnel.
   */
  async listUsers(profileType?: string, limit = 20, offset = 0): Promise<UserRecord[]> {
    try {
      return await this.repo.list(profileType, limit, offset);
    } catch (err) {
      throw new Error(`Failed to list users: ${(err as Error).message}`);
    }
  }

  /**
   * Met à jour un utilisateur.
   */
  async updateUser(id: string, payload: Partial<UserRecord>): Promise<UserRecord> {
    try {
      return await this.repo.update(id, payload);
    } catch (err) {
      throw new Error(`Failed to update user id=${id}: ${(err as Error).message}`);
    }
  }

  /**
   * Supprime un utilisateur.
   */
  async deleteUser(id: string): Promise<void> {
    try {
      await this.repo.delete(id);
    } catch (err) {
      throw new Error(`Failed to delete user id=${id}: ${(err as Error).message}`);
    }
  }

  /**
   * Retourne le nombre total d'utilisateurs.
   */
  async getUserCount(): Promise<number> {
    try {
      return await this.repo.count();
    } catch (err) {
      throw new Error(`Failed to count users: ${(err as Error).message}`);
    }
  }
}
