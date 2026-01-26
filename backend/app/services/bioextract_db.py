from app.db.mongo import mongodb
from app.models.bioextract import ATPSRecord
from typing import List, Optional

# Mock ATPS Data (Seeds)
SEED_ATPS_RECORDS = [
    {
        "id": "atps-001",
        "polymer1": "PEG",
        "polymer2": "Dextran",
        "polymer1MW": 6000,
        "polymer2MW": 500000,
        "polymer1Conc": 4.5,
        "polymer2Conc": 7.0,
        "temperature": 25,
        "pH": 7.0,
        "phaseFormation": True,
        "topPhase": "PEG",
        "bottomPhase": "Dextran",
        "reference": "Albertsson, 1986",
        "partitionCoefficient": 3.2
    },
    {
        "id": "atps-002",
        "polymer1": "PEG",
        "polymer2": "Phosphate",
        "polymer1MW": 4000,
        "polymer2MW": 0, # Salt
        "polymer1Conc": 12.5,
        "polymer2Conc": 10.0,
        "temperature": 20,
        "pH": 7.5,
        "phaseFormation": True,
        "topPhase": "PEG",
        "bottomPhase": "Salt",
        "reference": "Zaslavsky, 1995",
        "partitionCoefficient": 5.8
    }
]

class BioExtractService:
    @property
    def collection(self):
        return mongodb.db["atps_records"]

    async def init_defaults(self):
        # Insert seeds if empty
        if await self.collection.count_documents({}) == 0:
            for r in SEED_ATPS_RECORDS:
                await self.collection.insert_one(r)

    async def filter_atps(self, inner_phase: str) -> List[ATPSRecord]:
        # Perform Case-Insensitive Search
        # MongoDB regex query: { $or: [ { "polymer1": /pattern/i }, { "polymer2": /pattern/i } ] }
        pattern = f"^{inner_phase}$" # Strict match or loose match? Let's do partial or exact case-insesitive
        # The prompt implies looking for compatibility with the "inner phase" (usually the target biomolecule OR one of the phase components?)
        # Based on previous mock logic: r["polymer2"].lower() == inner_phase.lower()
        
        # Let's use regex for case-insensitive exact match
        regex = {"$regex": f"^{inner_phase}$", "$options": "i"}
        
        query = {
            "$or": [
                {"polymer1": regex},
                {"polymer2": regex}
            ]
        }
        
        cursor = self.collection.find(query)
        records = []
        async for doc in cursor:
            records.append(ATPSRecord(**doc))
        return records

bioextract_service = BioExtractService()
