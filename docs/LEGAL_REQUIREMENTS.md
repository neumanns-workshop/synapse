# Legal Requirements Checklist

## Required Legal Elements for Synapse

### 1. Copyright Notice ✅
**Requirement**: Display copyright notice on website and in app
**Format**: © 2025 Galaxy Brain Entertainment (Neumann's Workshop, LLC). All rights reserved.
**Placement**: Footer of website, About section in app, legal pages

### 2. Terms of Service ✅
- **Status**: ✅ Created (`docs/TERMS_OF_SERVICE.md`)
- **URL**: Should be accessible at `/terms`
- **Required**: Checkbox consent during signup

### 3. Privacy Policy ✅
- **Status**: ✅ Created (assuming you have one)
- **URL**: Should be accessible at `/privacy`
- **Required**: Checkbox consent during signup

### 4. Business Entity Information ✅
**Required Disclosure**:
- Business Name: Galaxy Brain Entertainment
- Legal Entity: Neumann's Workshop, LLC
- Contact: synapse@neumannsworkshop.com

### 5. DMCA Notice & Takedown Policy
**Required for**: Copyright-protected content (word embeddings, game content)
**Status**: ❌ Missing - need DMCA contact info

### 6. Trademark Notice
**Required for**: "Synapse" trademark protection
**Format**: Synapse™ or Synapse® (if registered)
**Status**: ❌ Missing - need trademark notice

### 7. Cookie Policy (EU/UK users)
**Required for**: GDPR compliance if serving EU users
**Status**: ❌ Missing - may need cookie banner

### 8. Age Restriction Notice
**Required for**: COPPA compliance
**Current**: Terms say "13 years old minimum"
**Status**: ✅ Covered in Terms of Service

### 9. Accessibility Statement
**Recommended for**: ADA compliance
**Status**: ❌ Missing - optional but recommended

### 10. Legal Contact Information
**Required for**: Business transparency
**Should include**:
- Business address (can be registered agent)
- Legal/compliance contact
- DMCA contact

---

## Implementation Checklist

### High Priority (Legal Requirements)
- [x] Add copyright notice to app footer
- [x] Add DMCA contact information
- [x] Add trademark notice for "Synapse"
- [x] Create business entity disclosure page
- [x] Ensure Terms/Privacy are linked properly

### Medium Priority (Best Practices)
- [ ] Cookie policy for EU users
- [ ] Accessibility statement
- [ ] Legal contact page

### UI Elements Needed
- [x] Website footer with legal links
- [x] App "About" section with legal info
- [x] Legal disclosure page

---

## Sample Footer Content

```
© 2025 Galaxy Brain Entertainment (Neumann's Workshop, LLC). All rights reserved.
Synapse™ is a trademark of Galaxy Brain Entertainment.

Terms of Service | Privacy Policy | Contact | DMCA
```

---

## Sample About Page Content

```
About Synapse

Synapse™ is developed by Galaxy Brain Entertainment, 
operating under Neumann's Workshop, LLC.

Contact: synapse@neumannsworkshop.com
Legal: legal@neumannsworkshop.com (if separate)
DMCA: dmca@neumannsworkshop.com (if separate)

Business Information:
Galaxy Brain Entertainment
A division of Neumann's Workshop, LLC
[Your business address or registered agent address]
``` 