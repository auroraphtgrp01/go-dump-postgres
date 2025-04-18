--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-04-18 10:53:53 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3358 (class 0 OID 16388)
-- Dependencies: 217
-- Data for Name: newtable; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.newtable DISABLE TRIGGER ALL;



ALTER TABLE public.newtable ENABLE TRIGGER ALL;

--
-- TOC entry 3359 (class 0 OID 16391)
-- Dependencies: 218
-- Data for Name: newtable_1; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.newtable_1 DISABLE TRIGGER ALL;

INSERT INTO public.newtable_1 (column1) VALUES ('11');


ALTER TABLE public.newtable_1 ENABLE TRIGGER ALL;

-- Completed on 2025-04-18 10:53:53 UTC

--
-- PostgreSQL database dump complete
--

