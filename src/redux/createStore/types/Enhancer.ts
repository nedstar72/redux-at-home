import type { Action } from './Action';
import type { Reducer } from './Reducer';
import type { Store } from './Store';

export interface EnhancedStoreCreator<
  StoreExt extends UnknownObject = EmptyObject,
  StateExt extends UnknownObject = EmptyObject,
> {
  <S, A extends Action>(reducer: Reducer<S, A>): Store<S & StateExt, A> & StoreExt;
}

export interface Enhancer<
  StoreExt extends UnknownObject = EmptyObject,
  StateExt extends UnknownObject = EmptyObject,
> {
  <
    NextStoreExt extends UnknownObject = EmptyObject,
    NextStateExt extends UnknownObject = EmptyObject,
  >(
    next: EnhancedStoreCreator<NextStoreExt, NextStateExt>,
  ): EnhancedStoreCreator<NextStoreExt & StoreExt, NextStateExt & StateExt>;
}
