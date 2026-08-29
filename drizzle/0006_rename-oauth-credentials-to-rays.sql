-- Rename the internal credential discriminator while preserving encrypted token data.
UPDATE `credentials` SET `type` = 'ray' WHERE `type` = 'oauth';
