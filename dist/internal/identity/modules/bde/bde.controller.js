"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BdeController = void 0;
class BdeController {
    bdeService;
    constructor(bdeService) {
        this.bdeService = bdeService;
    }
    /**
     * Create BDE
     * Only universities (profile_type = 'universite') can create a BDE
     */
    async createBde(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            // Authorization is enforced by the route preHandler: [authenticate, authorize(['universite'])]
            // Do NOT trust client-provided `universite_id` — ignore it and use the authenticated user's id.
            const body = request.body;
            if (body.universite_id)
                delete body.universite_id;
            const bde = await this.bdeService.createBde(body, user.id);
            return reply.status(201).send({
                success: true,
                data: bde,
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
     * Get BDE by ID
     */
    async getBdeById(request, reply) {
        try {
            const { id } = request.params;
            const bde = await this.bdeService.getBdeById(id);
            if (!bde) {
                return reply.status(404).send({
                    success: false,
                    error: 'BDE not found',
                });
            }
            return reply.send({
                success: true,
                data: bde,
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
     * Get BDE by University ID
     */
    async getBdeByUniversiteId(request, reply) {
        try {
            const { universite_id } = request.params;
            const bde = await this.bdeService.getBdeByUniversiteId(universite_id);
            if (!bde) {
                return reply.send({
                    success: true,
                    data: null, // Return null instead of 404 for better frontend handling
                });
            }
            return reply.send({
                success: true,
                data: bde,
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
     * Get BDE for the authenticated university
     */
    async getMyBde(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            const bde = await this.bdeService.getMyBde(user.id);
            return reply.send({
                success: true,
                data: bde || null,
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
     * Update BDE
     * Only the university that owns the BDE can update it
     */
    async updateBde(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            const { id } = request.params;
            const body = request.body;
            // Verify ownership: get BDE and check if it belongs to user's university
            const bde = await this.bdeService.getBdeById(id);
            if (!bde) {
                return reply.status(404).send({
                    success: false,
                    error: 'BDE not found',
                });
            }
            if (bde.profile_id !== user.id) {
                return reply.status(403).send({
                    success: false,
                    error: 'You do not have permission to update this BDE',
                });
            }
            const updated = await this.bdeService.updateBde(id, body);
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
     * Delete BDE (soft delete)
     * Only the university that owns the BDE can delete it
     */
    async deleteBde(request, reply) {
        try {
            const user = request.user;
            if (!user) {
                return reply.status(401).send({ success: false, error: 'Unauthorized' });
            }
            const { id } = request.params;
            // Verify ownership
            const bde = await this.bdeService.getBdeById(id);
            if (!bde) {
                return reply.status(404).send({
                    success: false,
                    error: 'BDE not found',
                });
            }
            if (bde.profile_id !== user.id) {
                return reply.status(403).send({
                    success: false,
                    error: 'You do not have permission to delete this BDE',
                });
            }
            await this.bdeService.deleteBde(id);
            return reply.send({
                success: true,
                message: 'BDE deleted successfully',
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
exports.BdeController = BdeController;
