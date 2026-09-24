# Security Best Practices & Data Handling

Security guidelines for deploying and using MaxiMinion.AI.

## Data Privacy

### What Data Does MaxiMinion Process?

**Collected:**
- Source code files and dependencies
- AST/dependency graph structure
- Code comments and documentation
- File metadata (names, sizes)

**Not Collected:**
- Runtime secrets (API keys are removed)
- Personal information (PII is sanitized)
- Environment variables (stripped during processing)
- Credentials (never stored)

### Data Retention

| Edition | Retention | Location |
|---------|-----------|----------|
| Community | Session only | Local machine |
| Professional | 90 days | Encrypted cloud storage |
| Enterprise | Per contract | Customer choice |

### Data Deletion

```bash
# Community: Automatic on session end
# Professional: Request via dashboard
# Enterprise: On-demand via API
```

---

## Secret Detection & Sanitization

### Detected Patterns

MaxiMinion detects and removes:

**API Keys**
- OpenAI: `sk-...`, `sk-proj-...`
- Anthropic: `sk-ant-...`
- AWS: `AKIA...`
- GitHub: `ghp_...`, `ghs_...`
- Stripe: `sk_live_...`, `sk_test_...`

**Credentials**
- Username:password patterns
- Database connection strings
- SSH private keys
- JWT tokens
- OAuth tokens

**PII**
- Email addresses
- Phone numbers
- Credit card numbers (Luhn check)
- Social security numbers
- IP addresses (optionally)

**Environment Secrets**
- Database passwords
- API keys in .env files
- Private key files
- Configuration secrets

### Custom Patterns

```bash
# Add custom secret pattern
npx @maximinion/refiner --add-pattern "MY_SECRET_PREFIX_.*" --type "custom"

# Verify patterns
npx @maximinion/refiner --list-patterns
```

---

## Network Security

### TLS/SSL Configuration

**Required for Professional/Enterprise:**
```bash
# Minimum: TLS 1.2
# Recommended: TLS 1.3

# Certificate pinning
export CA_CERT_PATH=/etc/ssl/certs/maximinion-ca.crt
```

### API Authentication

**Methods:**
1. **API Keys** (Professional)
   ```bash
   curl -H "Authorization: Bearer max_abc123..." https://api.maximinion.ai/...
   ```

2. **OAuth2** (Enterprise)
   ```bash
   # Supports OIDC, SAML 2.0
   ```

3. **mTLS** (Enterprise)
   ```bash
   # Client certificate authentication
   ```

### Rate Limiting

- **Community:** No rate limit (local)
- **Professional:** 100 req/min per API key
- **Enterprise:** Custom limits

---

## Access Control

### Role-Based Access Control (RBAC) - Enterprise

| Role | Permissions |
|------|-------------|
| Admin | Full access, manage users, billing |
| Editor | Create/modify manifests, upload code |
| Viewer | Read-only access |
| Auditor | Access logs, compliance reports |

### API Key Management

```bash
# Generate new key
curl -X POST https://api.maximinion.ai/keys \
  -H "Authorization: Bearer ..." \
  -d '{"name": "my-key"}'

# Rotate keys
curl -X POST https://api.maximinion.ai/keys/rotate/{key_id}

# Revoke key
curl -X DELETE https://api.maximinion.ai/keys/{key_id}
```

---

## Compliance & Certifications

### Supported Standards

| Standard | Edition | Status |
|----------|---------|--------|
| **GDPR** | Professional + | ✅ Compliant |
| **CCPA** | Professional + | ✅ Compliant |
| **HIPAA** | Enterprise | ✅ Available |
| **SOC 2 Type II** | Enterprise | ✅ Available |
| **ISO 27001** | Enterprise | ✅ Available |

### Data Residency

**Professional Edition:**
- US (default)
- EU (GDPR compliance)
- APAC (Singapore)

**Enterprise Edition:**
- Customer datacenter
- AWS/Azure/GCP regions
- Air-gapped deployment

### Right to be Forgotten (GDPR)

```bash
# Delete all data for user/project
curl -X DELETE https://api.maximinion.ai/users/{user_id} \
  -H "Authorization: Bearer ..."
```

---

## Vulnerability Reporting

**Do not disclose vulnerabilities publicly!**

### Responsible Disclosure

1. Email: security@maximinion.ai
2. Include: detailed reproduction steps
3. Allow: 90 days for patch before disclosure

### Supported Versions

- **Latest:** Full security updates
- **Previous:** 6 months of updates
- **Older:** Security-critical only

---

## Security Hardening

### Community Edition

```bash
# Disable network access
npx @maximinion/proxy-transport --disable-network

# Use local socket instead of port
npx @maximinion/proxy-transport --socket /tmp/maximinion.sock
```

### Professional/Enterprise

```bash
# Enable WAF
ENABLE_WAF=true

# Enable rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60

# Disable weak ciphers
DISABLE_WEAK_CIPHERS=true

# Enable security headers
ENABLE_SECURITY_HEADERS=true
```

### Network Isolation

```bash
# Allow only specific IPs
ALLOWED_CIDR_BLOCKS="10.0.0.0/8,172.16.0.0/12"

# VPC endpoint (AWS)
ENABLE_VPC_ENDPOINT=true
```

---

## Audit Logging

### What's Logged

- Authentication attempts
- API calls (inputs/outputs stripped of secrets)
- Configuration changes
- User actions
- System events

### Log Retention

- **Professional:** 30 days
- **Enterprise:** Per contract (1-7 years typical)

### Log Format

```json
{
  "timestamp": "2026-09-24T10:30:00Z",
  "user_id": "user_abc123",
  "action": "manifest_created",
  "resource": "manifest_123",
  "result": "success",
  "ip_address": "203.0.113.42",
  "user_agent": "MaxiMinion/1.0.0"
}
```

---

## Testing Security

### Running Security Checks

```bash
# OWASP dependency check
npm run security-check

# Vulnerability scan
npm audit

# SAST (Static Application Security Testing)
npm run sast

# Secret detection
npm run detect-secrets
```

### Penetration Testing

Available for Enterprise customers. Contact: penetration@maximinion.ai

---

## Security Updates

### Patch Schedule

- **Critical:** Within 24 hours
- **High:** Within 1 week
- **Medium:** Within 2 weeks
- **Low:** Next regular release

### Notification

- Email alerts for security updates
- GitHub security advisories
- Release notes

---

## FAQ

**Q: Where is my code stored?**
- Community: Nowhere (local only)
- Professional: Encrypted AWS S3
- Enterprise: Your choice (datacenter, cloud, air-gapped)

**Q: Is my code scanned by humans?**
- No. Only by automated algorithms.
- Professional/Enterprise: Zero knowledge architecture option.

**Q: Can you access my data?**
- No. Community: Can't (local). Professional: Can't (encrypted). Enterprise: Only with explicit authorization.

**Q: What about compliance requirements?**
- See [Compliance & Certifications](#compliance--certifications) above.

---

## Resources

- [Security Policy](https://github.com/maximinion/maximinion.ai/security/policy)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Security Questions?** Email: security@maximinion.ai
