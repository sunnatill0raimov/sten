# STEN MongoDB Schema Update

## Overview
Updated the STEN MongoDB schema to support encrypted messages and hashed passwords with enhanced security features.

## Schema Changes

### New Fields Added
- `encryptedMessage` (string, required) - The encrypted message content
- `iv` (string, required) - Initialization vector for encryption
- `passwordSalt` (string, required) - Salt for password hashing
- `oneTime` (boolean, default: false) - Flag for one-time use STENs

### Field Renames
- `encryptedData` → `encryptedMessage`
- `winnersCount` → `currentWinners`

### Complete Schema Structure
```javascript
{
  // Core encryption fields
  encryptedMessage: String (required),
  iv: String (required),
  
  // Password security fields
  passwordHash: String (required),
  passwordSalt: String (required),
  
  // STEN configuration
  maxWinners: Number (required, min: 1),
  currentWinners: Number (default: 0, min: 0),
  oneTime: Boolean (default: false),
  
  // Timing fields
  expiresAt: Date (required),
  createdAt: Date (default: Date.now),
  
  // Status tracking
  solved: Boolean (default: false),
  solvedBy: [String], // Array of user IDs
  
  // Security metadata
  securityLevel: String (enum: ['low', 'medium', 'high'], default: 'high'),
  passwordStrength: String (enum: ['weak', 'medium', 'strong', 'very-strong'], default: 'medium')
}
```

## Indexing Strategy

### Critical Indexes

#### 1. TTL Index for Automatic Cleanup
```javascript
stenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```
**Purpose**: Automatically removes expired STENs from the database
**Why Critical**: 
- Prevents storage bloat
- Ensures data privacy compliance
- Improves query performance by reducing collection size

#### 2. Compound Index for Active STENs
```javascript
stenSchema.index({ solved: 1, currentWinners: 1 });
```
**Purpose**: Efficiently find unsolved STENs with available winner slots
**Why Critical**:
- Optimizes the main solve operation
- Supports complex queries for active challenges
- Essential for lottery functionality performance

#### 3. Chronological Index
```javascript
stenSchema.index({ createdAt: -1 });
```
**Purpose**: Support sorting by creation date (newest first)
**Why Important**:
- Enables recent STEN listings
- Supports analytics and reporting
- Improves user experience in feeds

#### 4. One-Time STEN Index
```javascript
stenSchema.index({ oneTime: 1, solved: 1 });
```
**Purpose**: Efficient filtering of one-time STENs by status
**Why Important**:
- Optimizes one-time STEN queries
- Supports special use cases
- Enables targeted marketing features

## Middleware Updates

### Pre-save Middleware
1. **Auto-solve Detection**: Automatically sets `solved: true` when `currentWinners >= maxWinners`
2. **One-time Logic**: Marks one-time STENs as solved after first win
3. **Validation**: Ensures `maxWinners` is 1 for one-time STENs

## Security Enhancements

### Separation of Concerns
- **IV Separation**: IV is now stored separately from encrypted message for better security architecture
- **Salt Separation**: Password salt is stored independently for enhanced password security
- **Field Validation**: All sensitive fields have proper validation

### Backward Compatibility
- Existing encryption/hashing utilities remain compatible
- Controller updates handle field name changes transparently
- API responses maintain consistent structure

## Controller Updates

### Field Mapping Updates
- All controller methods updated to use new field names
- Response objects include `oneTime` and `currentWinners`
- Create function extracts IV and salt from crypto data
- Solve function uses atomic operations with new field names

### Enhanced Functionality
- Support for one-time STENs in create operation
- Proper validation of one-time STEN constraints
- Updated error handling for new field requirements

## Migration Considerations

### For Existing Data
1. **Field Migration**: Existing `encryptedData` → `encryptedMessage`
2. **IV Extraction**: Extract IV from existing encrypted data structures
3. **Salt Extraction**: Extract salt from existing password hashes
4. **Counters Update**: `winnersCount` → `currentWinners`

### Database Impact
- New indexes will be created automatically
- TTL index will start cleaning expired documents
- Compound indexes improve query performance
- No data loss during migration

## Performance Impact

### Query Improvements
- TTL index reduces collection size over time
- Compound indexes speed up common queries
- Better indexing strategy reduces full collection scans

### Storage Impact
- Separated fields may slightly increase storage size
- TTL index reduces long-term storage needs
- Indexes add storage overhead but improve performance

## Testing Recommendations

### Unit Tests
- Test new field validation
- Verify middleware functionality
- Test one-time STEN logic

### Integration Tests
- Test create/read/update/delete operations
- Verify encryption/decryption workflows
- Test atomic solve operations

### Performance Tests
- Verify index effectiveness
- Test TTL cleanup performance
- Benchmark query improvements
