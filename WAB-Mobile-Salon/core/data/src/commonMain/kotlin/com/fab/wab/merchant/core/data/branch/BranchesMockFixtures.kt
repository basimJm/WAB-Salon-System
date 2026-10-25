package com.fab.wab.merchant.core.data.branch

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MockFixture

/** Koin name of the mock branch list (dev builds with `DATA_SOURCE=mock`). */
const val MOCK_BRANCHES_FIXTURE = "mockBranches"

private const val WEEK =
    """[{"day":"SUN","isOff":false,"open":"10:00","close":"22:00"},{"day":"MON","isOff":false,"open":"10:00","close":"22:00"},""" +
        """{"day":"TUE","isOff":false,"open":"10:00","close":"22:00"},{"day":"WED","isOff":false,"open":"10:00","close":"22:00"},""" +
        """{"day":"THU","isOff":false,"open":"10:00","close":"22:00"},{"day":"FRI","isOff":true,"open":"10:00","close":"22:00"},""" +
        """{"day":"SAT","isOff":false,"open":"10:00","close":"22:00"}]"""

private const val COMPLETE = """{"missing":[],"isComplete":true}"""

/** Three branches like the server demo salon (main, active, offline) so the switcher and management have data. */
private val BRANCHES_JSON =
    """{"success":true,"message":"","data":[""" +
        """{"id":"b-main","name":{"ar":"عبدون","en":"Abdoun"},"isMain":true,"status":"ACTIVE",""" +
        """"location":{"latitude":31.9539,"longitude":35.8800},"locationText":"__TEXT__","cityId":"id-1","areaId":"id-1",""" +
        """"phone":"+962791111111","weeklySchedule":$WEEK,"completeness":$COMPLETE},""" +
        """{"id":"b-khalda","name":{"ar":"خلدا","en":"Khalda"},"isMain":false,"status":"ACTIVE",""" +
        """"location":{"latitude":31.9900,"longitude":35.8300},"locationText":"__TEXT__","cityId":"id-1","areaId":"id-1",""" +
        """"phone":"+962792222222","whatsapp":"+962792222222","weeklySchedule":$WEEK,"completeness":$COMPLETE},""" +
        """{"id":"b-dabouq","name":{"ar":"دابوق","en":"Dabouq"},"isMain":false,"status":"OFFLINE",""" +
        """"location":{"latitude":31.9800,"longitude":35.8100},"locationText":"__TEXT__","cityId":"id-1","areaId":"id-1",""" +
        """"phone":"+962793333333","weeklySchedule":$WEEK,"offline":{"reason":"__TEXT__","at":"2026-10-20T08:00:00Z"},""" +
        """"completeness":{"missing":["SERVICE"],"isComplete":false}}]}"""

val mockBranchesFixture = MockFixture(MerchantOperations.getBranches.method.name, MerchantOperations.getBranches.path, BRANCHES_JSON)
