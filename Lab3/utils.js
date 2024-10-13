'use strict';

import { maxProcessCounter, newProcessCreationProbability, workingSetUpdateProbability } from "./constants.js";

export const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
export const shouldGenerateNewWorkingSet = () => Math.random() < workingSetUpdateProbability / 100;
export const shouldCreateNewProc = (procQueue) => procQueue.length < maxProcessCounter && Math.random() < newProcessCreationProbability / 100;