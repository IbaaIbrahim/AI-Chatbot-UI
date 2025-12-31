import { ActionType } from "../../../../redux/reducers/actions"

// Define type for actions
class ActionStore {
  type: ActionType;
  payload?: any;

  constructor(type: ActionType, payload?: any) {
    this.type = type
    this.payload = payload
  }
}

export { ActionStore }
