-- Credential records use the technical OAuth discriminator; Rays are the public brand.
UPDATE `credentials` SET `type` = 'oauth' WHERE `type` = 'ray';
