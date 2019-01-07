alter table cr_revisions add column data jsonb;
alter table apm_packages add column data jsonb;
alter table cr_revisions add column checksum varchar(50);

\if false
drop table if exists cms_articles cascade;
drop table if exists cms_article_revisions cascade;
drop table if exists cms_authors cascade;
drop table if exists cms_author_revisions cascade;
drop table if exists cms_publishers cascade;
drop table if exists cms_publisher_revisions cascade;
\endif
