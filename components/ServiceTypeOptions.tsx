import { serviceTypeGroups, serviceTypes } from '@/lib/service-types'

export default function ServiceTypeOptions({ currentValue }: { currentValue?: string }) {
  return <>
    {currentValue && !(serviceTypes as readonly string[]).includes(currentValue) && <option value={currentValue}>{currentValue}</option>}
    {Object.entries(serviceTypeGroups).map(([group, types]) => <optgroup key={group} label={group}>
      {types.map(type => <option key={type} value={type}>{type}</option>)}
    </optgroup>)}
  </>
}
