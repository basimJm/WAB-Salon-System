# AI Agents Configuration

This file contains rules that AI coding agents MUST follow when working with this project.

---

## Required Documentation Reading

Before answering ANY question or making ANY changes to this project,
you MUST read the following documentation files first:

1. **TECHSTACK.md** - Technology stack and dependencies
2. **PROJECT_STRUCTURE.md** - Architecture and module structure

Failure to read these files may result in incorrect answers or code that
doesn't align with the project's established patterns.

## General Rules

1. **ALWAYS** reference actual source files when answering questions
2. **NEVER** assume implementation details without verifying them
3. **ALWAYS** follow the existing code style and conventions
4. **NEVER** commit secrets, API keys, or credentials
5. **ALWAYS** run tests before suggesting changes

## Architecture Guidelines

**Pattern**: clean + feature-driven

**Apps**:
- `iosApp`
- `composeApp`
- `androidApp`

**Core Modules**:
- `common`
- `data`
- `design-system`
- `di`
- `domain`
- `navigation`
- `network`
- `notification`
- `observability`
- `paging`
- `platform`
- `security`
- `storage`
- `time`
- `ui`
- `utils`

**Feature Modules**:
- `auth`
- `general`
- `onboarding`
- `orders`
- `profile`
- `wallet`

## Technology Guidelines

**Languages**:
- kotlin: 1.10.0

**Key Frameworks**:
- composeMultiplatform: 1.10.3
- ktor: 3.4.2
- koin: 4.2.0
- compose-navigation: 2.9.2
- maps-compose: 4.3.3

## Build Commands

```bash
# Build all modules
./gradlew build

# Build Android app
./gradlew :androidApp:assembleDebug

# Build iOS framework
./gradlew :composeApp:assemble
```

---
*This file is auto-generated. Do not edit manually.*