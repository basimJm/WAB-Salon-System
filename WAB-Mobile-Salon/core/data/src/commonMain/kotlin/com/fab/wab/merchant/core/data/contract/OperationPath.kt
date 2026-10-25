package com.fab.wab.merchant.core.data.contract

import com.fab.wab.merchant.core.data.contract.generated.Operation

private const val PARAM_START = '{'
private const val PARAM_END = '}'

/** Fills the `{param}` placeholders of a generated operation path; keys are the operation's own `pathParams`. */
fun Operation.pathWith(vararg params: Pair<String, String>): String {
    require(params.map { it.first }.toSet() == pathParams.toSet()) { "path params of $path: $pathParams" }
    return params.fold(path) { acc, (name, value) -> acc.replace("$PARAM_START$name$PARAM_END", value) }
}
