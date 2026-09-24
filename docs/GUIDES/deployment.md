# Deployment & Hosting Guide

Complete guide for deploying MaxiMinion.AI in production environments.

## Quick Start

| Use Case | Recommendation | Time |
|----------|-----------------|------|
| **Local Development** | Community Edition, local CLI | 30 min |
| **Small Team (2-10)** | Professional Edition, cloud-hosted | 1-2 hours |
| **Enterprise (50+)** | Enterprise Edition, on-premise or private cloud | 4-8 hours |

---

## Community Edition (Local Deployment)

### Prerequisites
- Node.js 18+
- npm 9+
- ~100MB disk space

### Installation

```bash
npm install -g @maximinion/refiner @maximinion/librarian \
  @maximinion/manifest-generator @maximinion/proxy-transport
```

### Usage

```bash
# Phase 1: Sanitize code
npx @maximinion/refiner --input ./src --output refined.json

# Phase 2: Analyze dependencies
npx @maximinion/librarian --input ./src --output graph.json

# Phase 3: Generate manifest
npx @maximinion/manifest-generator \
  --input ./src \
  --refiner-output refined.json \
  --librarian-output graph.json \
  --format markdown

# Phase 4: Start proxy
npx @maximinion/proxy-transport --port 3000 --manifest ./manifest.md
```

### Data Retention
- Manifests: 30 days local cache
- Sessions: Single machine only
- Backup: Manual (git recommended)

---

## Professional Edition (Cloud-Hosted)

### Hosting Requirements

```
Minimum:
- CPU: 2 cores
- RAM: 2-4GB
- Storage: 50GB
- Bandwidth: 10Mbps

Recommended:
- CPU: 4+ cores
- RAM: 8GB
- Storage: 100GB+
- Bandwidth: 100Mbps+
```

### Supported Cloud Providers

- **AWS:** EC2 + RDS + ElastiCache
- **Azure:** App Service + PostgreSQL + Redis
- **GCP:** Cloud Run + Cloud SQL + Memorystore
- **DigitalOcean:** App Platform + Managed Databases

### Architecture

```
Client (IDE Extension)
    ↓
API Gateway (Load Balanced)
    ↓
Application Server (Node.js)
    ↓
Storage Layer:
├── PostgreSQL (manifests metadata)
├── Redis (distributed cache)
└── S3/Blob (archive storage)
```

### Environment Variables

```bash
# API Configuration
API_PORT=3000
API_HOST=managed.maximinion.ai
NODE_ENV=production

# Database
DB_HOST=postgresql.yourcloud.com
DB_PORT=5432
DB_NAME=maximinion
DB_USER=app_user
DB_PASSWORD=<secure-password>

# Cache
REDIS_HOST=redis.yourcloud.com
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Storage
STORAGE_PROVIDER=aws|azure|gcp
STORAGE_BUCKET=maximinion-manifests

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
JWT_SECRET=<secure-random-key>
API_KEY_PREFIX=max_
```

### Deployment Steps

#### 1. Provision Cloud Resources

See [Azure IaC Generator](https://github.com/Azure/AIStudio) or [Terraform Registry](https://registry.terraform.io/) for infrastructure setup.

#### 2. Deploy Application

```bash
# Build Docker image
docker build -t maximinion:latest .

# Push to registry
docker tag maximinion:latest yourregistry.azurecr.io/maximinion:latest
docker push yourregistry.azurecr.io/maximinion:latest

# Deploy to cloud
# (AWS ECS, Azure Container Instances, Google Cloud Run, etc.)
```

#### 3. Configure Database & Cache

```bash
# PostgreSQL initialization
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < schema.sql

# Redis connection test
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

#### 4. Set Up SSL/TLS

```bash
# For AWS: Use ACM (AWS Certificate Manager)
# For Azure: Use App Service Managed Certificates
# For GCP: Use Google-managed certificates
```

#### 5. Health Checks

```bash
# Test API endpoint
curl https://managed.maximinion.ai/health

# Response should be:
# {"status": "healthy", "version": "1.0.0"}
```

### Monitoring & Alerts

```bash
# CPU/Memory
- Alert if CPU > 80% for 5 minutes
- Alert if Memory > 85%

# Database
- Alert if connections > 80 of max
- Alert if query latency > 1000ms

# Cache
- Alert if hit rate < 60%
- Alert if memory usage > 80%

# API
- Alert if error rate > 1%
- Alert if P95 latency > 500ms
```

### Scaling

#### Horizontal Scaling

```yaml
# Kubernetes autoscaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maximinion-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maximinion
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Vertical Scaling

- Increase CPU/memory per pod as needed
- Monitor performance metrics
- Upgrade database plan if needed

### Backups

```bash
# PostgreSQL backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup.sql

# Redis backup
redis-cli -h $REDIS_HOST BGSAVE

# S3/Blob storage: Enable versioning and MFA Delete
```

---

## Enterprise Edition (On-Premise / Private Cloud)

### System Requirements

```
Minimum:
- CPU: 8 cores
- RAM: 16GB
- Storage: 500GB SSD
- Network: Gigabit Ethernet
- OS: Linux (RHEL 8+, Ubuntu 20.04+), Windows Server 2019+

Recommended:
- CPU: 16+ cores
- RAM: 32GB+
- Storage: 2TB+ SSD
- Network: 10Gbps
- HA: 3+ node cluster
```

### Deployment Options

#### Option 1: Kubernetes (Recommended)

```bash
# Add Helm repo
helm repo add maximinion https://charts.maximinion.ai

# Install with Helm
helm install maximinion maximinion/maximinion \
  --namespace maximinion \
  --values custom-values.yaml

# Verify
kubectl get pods -n maximinion
```

#### Option 2: Docker Compose

```bash
# Single-machine deployment
docker-compose -f docker-compose.yml up -d

# Check logs
docker-compose logs -f maximinion-api
```

#### Option 3: Bare Metal

```bash
# 1. Install prerequisites
sudo apt-get install nodejs npm postgresql redis-server

# 2. Download release
wget https://releases.maximinion.ai/v1.0.0/maximinion-1.0.0.tar.gz
tar -xzf maximinion-1.0.0.tar.gz

# 3. Install
cd maximinion-1.0.0
npm install --production

# 4. Start services
systemctl start postgresql
systemctl start redis-server
npm start
```

### Network Architecture

```
Internet
    ↓
Load Balancer (nginx / HAProxy)
    ↓
Firewall / WAF (ModSecurity)
    ↓
API Cluster (3+ nodes)
    ├── Node 1 (Leader)
    ├── Node 2 (Replica)
    └── Node 3 (Replica)
    ↓
Database Cluster
├── PostgreSQL Primary
├── PostgreSQL Replica 1
└── PostgreSQL Replica 2
    ↓
Shared Storage (NFS / iSCSI)
```

### Security

- **Network:** VPC isolation, private subnets
- **Authentication:** SSO/SAML integration
- **Encryption:** TLS 1.2+, AES-256 at rest
- **Audit:** Full logging and compliance records
- **Air-gapped:** Optional isolated deployment

### High Availability

```yaml
# 3-node cluster configuration
nodes:
  - name: node-1
    role: leader
    replicas: [node-2, node-3]
  - name: node-2
    role: replica
  - name: node-3
    role: replica

failover:
  strategy: automatic
  timeout: 30s
  election: raft
```

### Disaster Recovery

- **RTO:** 15 minutes (Enterprise SLA)
- **RPO:** 5 minutes
- **Backup:** Daily snapshots to isolated storage
- **Test:** Monthly DR drills

---

## Cost Estimation

| Edition | Tier | Monthly Cost | Max Users |
|---------|------|--------------|-----------|
| Community | Local | $0 | 1 |
| Professional | Starter | $29 | 5 |
| Professional | Growth | $99 | 20 |
| Professional | Scale | $299 | 100 |
| Enterprise | Base | $2,999 | 500+ |
| Enterprise | Premium | $9,999 | 2000+ |

---

## Troubleshooting

**Issue:** High latency (>500ms)
- Check network connectivity
- Monitor database query times
- Scale horizontally if CPU >80%

**Issue:** API timeouts
- Increase timeout values in config
- Check manifest file size
- Optimize database queries

**Issue:** Cache misses >40%
- Increase Redis memory allocation
- Review cache TTL settings
- Monitor eviction policies

---

## Next Steps

1. Choose your deployment option
2. Review [Security Guide](security.md)
3. See [Troubleshooting Guide](troubleshooting.md)
4. Contact sales@maximinion.ai for help

---

**Questions?** Email support@maximinion.ai
