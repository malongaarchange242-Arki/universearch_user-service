"use strict";
// src/modules/users/users.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const users_repository_1 = require("./users.repository");
/**
 * Service métier pour les utilisateurs. Il encapsule l'accès au repository
 * et applique la logique applicative si nécessaire.
 */
class UsersService {
    supabase;
    repo;
    constructor(supabase) {
        this.supabase = supabase;
        this.repo = new users_repository_1.UsersRepository(supabase);
    }
    /**
     * Récupère un utilisateur par son ID.
     */
    async getUserById(id) {
        try {
            return await this.repo.getById(id);
        }
        catch (err) {
            throw new Error(`Failed to get user by id=${id}: ${err.message}`);
        }
    }
    /**
     * Liste les utilisateurs avec pagination et filtre optionnel.
     */
    async listUsers(profileType, limit = 20, offset = 0) {
        try {
            return await this.repo.list(profileType, limit, offset);
        }
        catch (err) {
            throw new Error(`Failed to list users: ${err.message}`);
        }
    }
    /**
     * Met à jour un utilisateur.
     */
    async updateUser(id, payload) {
        try {
            return await this.repo.update(id, payload);
        }
        catch (err) {
            throw new Error(`Failed to update user id=${id}: ${err.message}`);
        }
    }
    /**
     * Supprime un utilisateur.
     */
    async deleteUser(id) {
        try {
            await this.repo.delete(id);
        }
        catch (err) {
            throw new Error(`Failed to delete user id=${id}: ${err.message}`);
        }
    }
    /**
     * Retourne le nombre total d'utilisateurs.
     */
    async getUserCount() {
        try {
            return await this.repo.count();
        }
        catch (err) {
            throw new Error(`Failed to count users: ${err.message}`);
        }
    }
}
exports.UsersService = UsersService;
