/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import {
    buildAcceptConfig,
    buildClassPathConfig,
    buildConsumesConfig,
    buildCookieConfig,
    buildCookiesConfig,
    buildDeprecatedConfig,
    buildDescriptionConfig,
    buildExampleConfig,
    buildExtensionConfig,
    buildFileParamConfig,
    buildFilesParamsConfig,
    buildFormConfig,
    buildFormsConfig,
    buildHeaderConfig,
    buildHeadersConfig,
    buildHiddenConfig,
    buildIsDoubleConfig,
    buildIsFloatConfig,
    buildIsIntConfig,
    buildIsLongConfig,
    buildMethodAllConfig,
    buildMethodDeleteConfig,
    buildMethodGetConfig,
    buildMethodHeadConfig,
    buildMethodOptionsConfig,
    buildMethodPatchConfig,
    buildMethodPathConfig,
    buildMethodPostConfig,
    buildMethodPutConfig,
    buildParamConfig,
    buildPathParamConfig,
    buildPathParamsConfig,
    buildProducesConfig,
    buildQueryConfig,
    buildQueryPropConfig,
    buildSecurityConfig,
    buildTagsConfig,
} from './decorators';

export const schema = {
    extends: [],
    items: [
        buildAcceptConfig(),
        buildClassPathConfig(),
        buildConsumesConfig(),
        buildDeprecatedConfig(),
        buildDescriptionConfig(),
        buildExampleConfig(),
        buildExtensionConfig(),
        buildHiddenConfig(),
        buildMethodAllConfig(),
        buildMethodDeleteConfig(),
        buildMethodGetConfig(),
        buildMethodHeadConfig(),
        buildMethodOptionsConfig(),
        buildMethodPatchConfig(),
        buildMethodPathConfig(),
        buildMethodPostConfig(),
        buildMethodPutConfig(),
        buildParamConfig(),
        buildParamConfig(),
        buildCookieConfig(),
        buildCookiesConfig(),
        buildFileParamConfig(),
        buildFilesParamsConfig(),
        buildFormConfig(),
        buildFormsConfig(),
        buildFormsConfig(),
        buildHeaderConfig(),
        buildHeadersConfig(),
        buildPathParamConfig(),
        buildPathParamsConfig(),
        buildQueryPropConfig(),
        buildQueryConfig(),
        buildProducesConfig(),
        buildIsDoubleConfig(),
        buildIsFloatConfig(),
        buildIsIntConfig(),
        buildIsLongConfig(),
        buildSecurityConfig(),
        buildTagsConfig(),
    ],
} satisfies PresetSchema;
