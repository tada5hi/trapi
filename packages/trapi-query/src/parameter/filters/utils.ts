import {FilterOperator, FilterOperatorLabel, FilterOperatorLabelType} from "./type";

const config : {
    sign: FilterOperator,
    label: FilterOperatorLabel
}[] = [];

const operatorKeys = Object.keys(FilterOperator);
for(let i=0; i<operatorKeys.length; i++) {
    config.push({
        sign: FilterOperator[operatorKeys[i]],
        label: FilterOperatorLabel[operatorKeys[i]]
    })
}

export function determineFilterOperatorLabelsByValue(input: string) : {
    operators: FilterOperatorLabelType[],
    value: string | string[]
} {
    let value : string[] | string = input;

    const operators : FilterOperatorLabelType[] = [];

    for(let i=0; i<config.length; i++) {
        if(typeof value !== 'string') {
            continue;
        }

        switch (config[i].sign) {
            case FilterOperator.IN:
                if(
                    value.includes(config[i].sign)
                ) {
                    operators.push(config[i].label);
                    value = value.split(config[i].sign);
                }
                break;
            default:
                if(
                    value.slice(0, config[i].sign.length) === config[i].sign
                ) {
                    operators.push(config[i].label);
                    value = value.slice(config[i].sign.length);
                }
                break;
        }
    }

    return {
        operators,
        value
    }
}
