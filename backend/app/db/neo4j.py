from neo4j import GraphDatabase
from app.core.config import settings

class Neo4jDB:
    driver = None

    def connect(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            connection_timeout=5,
        )
        # Verify connection
        try:
            self.driver.verify_connectivity()
            print("Connected to Neo4j")
        except Exception as e:
            print(f"Failed to connect to Neo4j: {e}")

    def close(self):
        if self.driver:
            self.driver.close()
            print("Closed Neo4j connection")

    def get_session(self):
        if not self.driver:
            self.connect()
        return self.driver.session()

neo4j_db = Neo4jDB()
