# Threat Model - Literature Review Platform

## Overview

This document provides a STRIDE-based threat model for the Literature Review Platform, identifying potential security threats and corresponding mitigation strategies.

## System Architecture

The platform consists of:
- **Frontend**: React-based web application
- **Backend**: Fastify-based API server
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: S3-compatible storage for PDFs
- **Background Jobs**: Redis-based job queue
- **Authentication**: JWT-based session management

## STRIDE Analysis

### 1. Spoofing (Identity Threats)

**Threat**: Attackers impersonate legitimate users or services.

**Vulnerabilities**:
- Weak authentication mechanisms
- Session hijacking
- JWT token compromise
- Email spoofing

**Mitigations**:
- ✅ **JWT Validation**: Strong JWT validation with proper secret management
- ✅ **Session TTL**: Short-lived sessions with automatic expiration
- ✅ **Email Verification**: Required email verification for account creation
- ✅ **Password Requirements**: Strong password policies with bcrypt hashing
- ✅ **Rate Limiting**: Prevent brute force attacks on authentication endpoints
- 🔄 **2FA Support**: Multi-factor authentication (planned)
- 🔄 **OAuth Integration**: Social login providers (planned)

**Implementation**:
```typescript
// JWT validation with proper error handling
const token = request.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, env.JWT_SECRET);
```

### 2. Tampering (Data Integrity Threats)

**Threat**: Attackers modify data in transit or at rest.

**Vulnerabilities**:
- Unencrypted data transmission
- File upload tampering
- Database injection attacks
- Man-in-the-middle attacks

**Mitigations**:
- ✅ **TLS Everywhere**: HTTPS enforcement in production
- ✅ **Signed URLs**: Presigned URLs with expiration for file access
- ✅ **Input Validation**: Comprehensive input validation with Zod schemas
- ✅ **SQL Injection Prevention**: Prisma ORM with parameterized queries
- ✅ **File Integrity**: Virus scanning and file type validation
- ✅ **Immutable Audit Logs**: Tamper-evident audit trail
- 🔄 **Content Security Policy**: CSP headers (planned)

**Implementation**:
```typescript
// Signed URL generation with expiration
const signedUrl = generateSignedUrl(baseUrl, path, secret, {
  expiresIn: 600, // 10 minutes
  method: 'GET'
});
```

### 3. Repudiation (Non-repudiation Threats)

**Threat**: Users deny performing actions or receiving data.

**Vulnerabilities**:
- Lack of audit trails
- Missing request logging
- Insufficient evidence collection

**Mitigations**:
- ✅ **Audit Logs**: Comprehensive audit logging for all user actions
- ✅ **Request IDs**: Unique request identifiers for tracing
- ✅ **Timestamp Logging**: Precise timestamps for all operations
- ✅ **User Attribution**: All actions tied to authenticated users
- ✅ **Immutable Logs**: Audit logs cannot be modified
- 🔄 **Digital Signatures**: Cryptographic signatures for critical operations (planned)

**Implementation**:
```typescript
// Audit log creation
await prisma.auditLog.create({
  data: {
    projectId,
    userId,
    action: 'candidate_imported',
    details: { candidateId, source, title }
  }
});
```

### 4. Information Disclosure (Confidentiality Threats)

**Threat**: Sensitive data exposed to unauthorized parties.

**Vulnerabilities**:
- Insecure data storage
- Weak access controls
- Information leakage in logs
- Cross-user data access

**Mitigations**:
- ✅ **Row-Level Security**: Database-level access controls
- ✅ **JWT Authorization**: Proper authorization checks on all endpoints
- ✅ **PII Minimization**: Minimal collection of personally identifiable information
- ✅ **Log Redaction**: Sensitive data redacted from logs
- ✅ **Environment Variables**: Secrets stored in environment variables
- ✅ **Database Encryption**: Encrypted database connections
- 🔄 **Field-Level Encryption**: Sensitive fields encrypted at rest (planned)

**Implementation**:
```typescript
// Authorization check
const project = await prisma.project.findFirst({
  where: { id: projectId, ownerId: userId }
});
if (!project) {
  return sendError(reply, 'NOT_FOUND', 'Project not found or access denied', 404);
}
```

### 5. Denial of Service (Availability Threats)

**Threat**: Attackers prevent legitimate users from accessing the system.

**Vulnerabilities**:
- Resource exhaustion
- Unbounded queries
- Lack of rate limiting
- DDoS attacks

**Mitigations**:
- ✅ **Rate Limiting**: Global and per-route rate limits
- ✅ **Query Limits**: Pagination and query result limits
- ✅ **Async Processing**: Background job processing for heavy operations
- ✅ **Provider Timeouts**: Timeout limits for external API calls
- ✅ **Resource Monitoring**: System resource monitoring and alerting
- 🔄 **CDN Integration**: Content delivery network for static assets (planned)
- 🔄 **Load Balancing**: Multiple server instances (planned)

**Implementation**:
```typescript
// Rate limiting configuration
fastify.register(require('@fastify/rate-limit'), {
  global: true,
  max: 100,
  timeWindow: '1 minute'
});
```

### 6. Elevation of Privilege (Authorization Threats)

**Threat**: Attackers gain unauthorized access to administrative functions.

**Vulnerabilities**:
- Weak authorization checks
- Privilege escalation bugs
- Admin interface exposure
- Insufficient role separation

**Mitigations**:
- ✅ **RBAC**: Role-based access control implementation
- ✅ **Admin Route Protection**: Admin endpoints require elevated privileges
- ✅ **Dependency Updates**: Regular security updates for dependencies
- ✅ **Input Sanitization**: All inputs sanitized and validated
- ✅ **Principle of Least Privilege**: Minimal required permissions
- 🔄 **API Key Management**: Separate API keys for different access levels (planned)

**Implementation**:
```typescript
// Admin route protection
fastify.addHook('preHandler', async (request, reply) => {
  const user = await authenticateUser(request);
  if (!user.isAdmin) {
    return sendError(reply, 'FORBIDDEN', 'Admin access required', 403);
  }
});
```

## Security Controls Summary

### Implemented Controls

1. **Authentication & Authorization**
   - JWT-based authentication with proper validation
   - Row-level security in database queries
   - Admin route protection

2. **Data Protection**
   - TLS encryption in transit
   - Signed URLs for file access
   - Input validation and sanitization

3. **Audit & Monitoring**
   - Comprehensive audit logging
   - Request ID tracking
   - Error logging and monitoring

4. **Rate Limiting & DoS Protection**
   - Global rate limiting
   - Per-route rate limits
   - Query result pagination

5. **File Security**
   - Upload validation and virus scanning
   - Secure file storage with signed URLs
   - File type and size restrictions

### Planned Controls

1. **Enhanced Authentication**
   - Multi-factor authentication (2FA)
   - OAuth integration with social providers
   - API key management

2. **Advanced Security**
   - Content Security Policy (CSP) headers
   - Field-level encryption for sensitive data
   - Digital signatures for critical operations

3. **Infrastructure Security**
   - CDN integration for static assets
   - Load balancing across multiple instances
   - Advanced monitoring and alerting

## Risk Assessment

### High Risk
- **SQL Injection**: Mitigated by Prisma ORM
- **Authentication Bypass**: Mitigated by JWT validation
- **Data Exposure**: Mitigated by row-level security

### Medium Risk
- **File Upload Attacks**: Mitigated by validation and virus scanning
- **Rate Limit Bypass**: Mitigated by multiple rate limiting layers
- **Session Hijacking**: Mitigated by short session TTL

### Low Risk
- **Information Disclosure**: Mitigated by log redaction
- **DoS Attacks**: Mitigated by rate limiting and async processing

## Security Testing

### Automated Testing
- Unit tests for security functions
- Integration tests for authentication flows
- Rate limiting tests
- File upload validation tests

### Manual Testing
- Penetration testing of authentication flows
- File upload security testing
- Rate limiting effectiveness testing
- Admin interface security testing

## Incident Response

### Security Incident Procedures
1. **Detection**: Automated monitoring and alerting
2. **Assessment**: Impact and scope evaluation
3. **Containment**: Immediate threat isolation
4. **Eradication**: Remove threat and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Post-incident review and improvements

### Contact Information
- **Security Team**: security@litrev.com
- **Emergency Contact**: +1-XXX-XXX-XXXX
- **Bug Bounty**: security@litrev.com

## Compliance

### Data Protection
- **GDPR**: User data protection and right to deletion
- **CCPA**: California Consumer Privacy Act compliance
- **HIPAA**: Healthcare data protection (if applicable)

### Security Standards
- **OWASP Top 10**: Protection against common web vulnerabilities
- **NIST Cybersecurity Framework**: Comprehensive security controls
- **ISO 27001**: Information security management system

## Review and Updates

This threat model should be reviewed and updated:
- **Quarterly**: Regular security assessment
- **After Major Changes**: System architecture modifications
- **After Security Incidents**: Lessons learned integration
- **Annually**: Comprehensive security review

**Last Updated**: January 2025
**Next Review**: April 2025
