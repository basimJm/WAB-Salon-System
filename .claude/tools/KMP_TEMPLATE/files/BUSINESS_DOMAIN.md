# Domain reference

Business rules, entities and the backend contract of this app live here. The policy check `error-codes`
(`scripts/ci/policy/error_codes.py`) compares section 11 with `ErrorCode` (core/domain), the AR + EN
`error_code_<code>` strings and `ErrorHandling` (core/design-system): when the backend adds an error code,
add it to section 11 and to those three places.

## 11. Error Codes

```
__ERROR_CODES__
```
