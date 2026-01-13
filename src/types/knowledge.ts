// Knowledge Base Types

export interface CategoryNode {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    children: CategoryNode[];
    promptTemplate?: string;
    metadata?: Record<string, unknown>;
}

export interface CategoryTree {
    id: string;
    name: string;
    description: string;
    rootNodes: CategoryNode[];
}

// Materials Database Types
export interface Material {
    id: string;
    commonName: string;
    materialType: string;
    molecularWeight?: number;
    swellingRatio?: number;
    antimicrobial: boolean;
    degradationRate?: number;
    biocompatibility?: string;
    mechanicalProperties?: MechanicalProperties;
    applications?: string[];
    reviewStatus: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

export interface MechanicalProperties {
    youngsModulus?: number;
    tensileStrength?: number;
    elongation?: number;
}

// Literature Types
export interface Paper {
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    doi?: string;
    url?: string;
    publishedDate?: string;
    categoryIds: string[];
    features?: PaperFeatures;
    minioKey?: string;
    parsedContent?: string;
    embedding?: number[];
}

export interface PaperFeatures {
    materials?: string[];
    methods?: string[];
    outcomes?: string[];
    customFields?: Record<string, unknown>;
}

// Experiment Records
export interface Experiment {
    id: string;
    title: string;
    appScenario: string;
    globalOutcome: 'success' | 'partial' | 'failure';
    ingredients: Ingredient[];
    measurements: Record<string, unknown>;
    protocol?: string;
    createdAt: string;
    createdBy: string;
}

export interface Ingredient {
    name: string;
    concentration: string;
    role?: string;
}

// Scientific Tools
export interface ScientificTool {
    id: string;
    name: string;
    description: string;
    category: string;
    schema: Record<string, unknown>;
    endpoint: string;
    method: 'GET' | 'POST';
    authRequired: boolean;
}
