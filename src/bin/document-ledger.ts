#!/usr/bin/env node

import * as cdk from '@aws-cdk/core';

import { CredentialsStack } from '../stacks/credentials-stack';
import { LedgerStack } from '../stacks/ledger-stack';
import { InterfaceStack } from '../stacks/interface-stack';
import { ExplorerStack } from '../stacks/explorer-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new CredentialsStack(app, 'CredentialsStack', {env});
new LedgerStack(app, 'LedgerStack', {env});
new InterfaceStack(app, 'InterfaceStack', {env});
new ExplorerStack(app, 'ExplorerStack', {env});
