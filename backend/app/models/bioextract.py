from pydantic import BaseModel
from typing import List, Optional, Literal

class ATPSRecord(BaseModel):
    id: str
    polymer1: str
    polymer2: str
    polymer1MW: int
    polymer2MW: int
    polymer1Conc: float
    polymer2Conc: float
    temperature: float
    pH: float
    phaseFormation: bool
    topPhase: str
    bottomPhase: str
    partitionCoefficient: float
    reference: str
    doi: Optional[str] = None

class PolymerTag(BaseModel):
    polymerId: str
    polymerName: str
    tag: str
    rating: Literal['excellent', 'good', 'moderate', 'poor', 'none']
    conditions: Optional[str] = None
    mechanism: Optional[str] = None

class PolymerCandidate(BaseModel):
    name: str
    fullName: str
    matchCount: int
    coverageRate: int
    avgPartitionCoeff: float
    mwRange: List[float]
    compatibleWith: List[str]
    sourceRecordIds: List[str]

class FilterCriteria(BaseModel):
    innerPhase: str
    requiredTags: List[str]
