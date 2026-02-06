// MongoDB 初始化脚本
// 创建应用数据库和用户

db = db.getSiblingDB('biomedical_platform');

// 创建应用用户
db.createUser({
  user: 'bioagent',
  pwd: 'bioagent2024',  // 生产环境应该从环境变量读取
  roles: [
    {
      role: 'readWrite',
      db: 'biomedical_platform'
    }
  ]
});

// 创建索引以优化查询性能
db.biomaterials.createIndex({ "category": 1 });
db.biomaterials.createIndex({ "name": "text", "paper_titles": "text" });
db.biomaterials.createIndex({ "paper_ids": 1 });
db.biomaterials.createIndex({ "subcategory": 1 });

db.documents.createIndex({ "paper_id": 1 }, { unique: true });
db.documents.createIndex({ "title": "text", "authors": "text" });
db.documents.createIndex({ "journal": 1 });
db.documents.createIndex({ "publish_year": -1 });

db.paper_tags.createIndex({ "paper_id": 1 });
db.paper_tags.createIndex({ "l1": 1 });
db.paper_tags.createIndex({ "l2": 1 });
db.paper_tags.createIndex({ "classification": 1 });

print('MongoDB initialization completed');

