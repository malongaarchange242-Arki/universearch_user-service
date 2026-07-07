"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepresentantController = void 0;
class RepresentantController {
    representantService;
    constructor(representantService) {
        this.representantService = representantService;
    }
    /**
     * Create representant
     * Only centres (profile_type = 'centre_formation') can create representants
     */
    async createRepresentant(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            // Check if user is a centre (profile_type must be 'centre' or 'centre_formation')
            const profileType = (user.profile_type || user.role || user.userType || '').toLowerCase();
            const isCentre = profileType === 'centre' ||
                profileType === 'centre_formation' ||
                profileType.includes('centre');
            console.log('DEBUG createRepresentant:', {
                userId: user.id,
                profile_type: user.profile_type,
                role: user.role,
                userType: user.userType,
                profileType,
                isCentre
            });
            if (!isCentre) {
                return reply.status(403).send({
                    success: false,
                    error: 'Only centres de formation can create representants',
                });
            }
            const body = request.body;
            const representant = await this.representantService.createRepresentant(body, user.id);
            return reply.status(201).send({
                success: true,
                data: representant,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return reply.status(400).send({
                success: false,
                error: message,
            });
        }
    }
    /**
     * Get representant by ID
     */
    async getRepresentantById(request, reply) {
        try {
            const { id } = request.params;
            const representant = await this.representantService.getRepresentantById(id);
            if (!representant) {
                return reply.status(404).send({
                    success: false,
                    error: 'Representant not found',
                });
            }
            return reply.send({
                success: true,
                data: representant,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return reply.status(400).send({
                success: false,
                error: message,
            });
        }
    }
    /**
     * Get all representants for a centre
     */
    async getRepresentantsByCentreId(request, reply) {
        try {
            const { centre_id } = request.params;
            const representants = await this.representantService.getRepresentantsByCentreId(centre_id);
            return reply.send({
                success: true,
                data: representants,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return reply.status(400).send({
                success: false,
                error: message,
            });
        }
    }
    /**
     * Update representant
     * Only the centre that owns the representant can update it
     */
    async updateRepresentant(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            const { id } = request.params;
            const body = request.body;
            // Verify ownership
            const representant = await this.representantService.getRepresentantById(id);
            if (!representant) {
                return reply.status(404).send({
                    success: false,
                    error: 'Representant not found',
                });
            }
            if (representant.profile_id !== user.id) {
                return reply.status(403).send({
                    success: false,
                    error: 'You do not have permission to update this representant',
                });
            }
            const updated = await this.representantService.updateRepresentant(id, body);
            return reply.send({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return reply.status(400).send({
                success: false,
                error: message,
            });
        }
    }
    /**
     * Delete representant (soft delete)
     * Only the centre that owns the representant can delete it
     */
    async deleteRepresentant(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            const { id } = request.params;
            // Verify ownership
            const representant = await this.representantService.getRepresentantById(id);
            if (!representant) {
                return reply.status(404).send({
                    success: false,
                    error: 'Representant not found',
                });
            }
            if (representant.profile_id !== user.id) {
                return reply.status(403).send({
                    success: false,
                    error: 'You do not have permission to delete this representant',
                });
            }
            await this.representantService.deleteRepresentant(id);
            return reply.send({
                success: true,
                message: 'Representant deleted successfully',
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return reply.status(400).send({
                success: false,
                error: message,
            });
        }
    }
}
exports.RepresentantController = RepresentantController;
