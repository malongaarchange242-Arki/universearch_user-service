export const listFilieresSchema = {
  tags: ['Filières'],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nom: { type: 'string' },
          domaine_id: { type: 'string', format: 'uuid' }
        },
        additionalProperties: false
      }
    }
  }
};

export const domainesWithFilieresSchema = {
  tags: ['Domaines'],
  response: {
    200: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};
