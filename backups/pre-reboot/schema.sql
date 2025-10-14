--
-- PostgreSQL database dump
--

\restrict ACvGlzD08oQijTpu6Pm0HBMy23L5lv6v20LTNUCs0H1svmgc5yuhSy6ajZsdHGe

-- Dumped from database version 15.5
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: moreyu_admin
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO moreyu_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: rss_feeds; Type: TABLE; Schema: public; Owner: moreyu_admin
--

CREATE TABLE public.rss_feeds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    url text NOT NULL,
    category character varying(100),
    language character varying(5) DEFAULT 'de'::character varying,
    enabled boolean DEFAULT true,
    last_fetched timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.rss_feeds OWNER TO moreyu_admin;

--
-- Name: rss_items; Type: TABLE; Schema: public; Owner: moreyu_admin
--

CREATE TABLE public.rss_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feed_id uuid NOT NULL,
    guid character varying(500) NOT NULL,
    title text,
    original_title text,
    description text,
    original_description text,
    link text NOT NULL,
    pub_date timestamp without time zone,
    categories jsonb DEFAULT '[]'::jsonb,
    image_url text,
    price numeric(10,2),
    original_price numeric(10,2),
    discount integer,
    is_translated boolean DEFAULT false,
    translation_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    translation_provider character varying(32),
    translation_language character varying(8),
    translation_detected_language character varying(8),
    content_html text,
    content_text text,
    merchant_name text,
    merchant_logo text,
    currency character varying(16) DEFAULT 'EUR'::character varying,
    affiliate_url text,
    expires_at timestamp without time zone,
    CONSTRAINT rss_items_translation_status_check CHECK (((translation_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.rss_items OWNER TO moreyu_admin;

--
-- Name: translation_jobs; Type: TABLE; Schema: public; Owner: moreyu_admin
--

CREATE TABLE public.translation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    original_text text NOT NULL,
    translated_text text,
    source_language character varying(5) NOT NULL,
    target_language character varying(5) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    provider character varying(50),
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT translation_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT translation_jobs_type_check CHECK (((type)::text = ANY ((ARRAY['title'::character varying, 'description'::character varying])::text[])))
);


ALTER TABLE public.translation_jobs OWNER TO moreyu_admin;

--
-- Name: rss_feeds rss_feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.rss_feeds
    ADD CONSTRAINT rss_feeds_pkey PRIMARY KEY (id);


--
-- Name: rss_feeds rss_feeds_url_key; Type: CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.rss_feeds
    ADD CONSTRAINT rss_feeds_url_key UNIQUE (url);


--
-- Name: rss_items rss_items_feed_id_guid_key; Type: CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.rss_items
    ADD CONSTRAINT rss_items_feed_id_guid_key UNIQUE (feed_id, guid);


--
-- Name: rss_items rss_items_pkey; Type: CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.rss_items
    ADD CONSTRAINT rss_items_pkey PRIMARY KEY (id);


--
-- Name: translation_jobs translation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.translation_jobs
    ADD CONSTRAINT translation_jobs_pkey PRIMARY KEY (id);


--
-- Name: idx_rss_feeds_enabled; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_rss_feeds_enabled ON public.rss_feeds USING btree (enabled);


--
-- Name: idx_rss_items_feed_id; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_rss_items_feed_id ON public.rss_items USING btree (feed_id);


--
-- Name: idx_rss_items_pub_date; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_rss_items_pub_date ON public.rss_items USING btree (pub_date DESC);


--
-- Name: idx_rss_items_translation_status; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_rss_items_translation_status ON public.rss_items USING btree (translation_status);


--
-- Name: idx_translation_jobs_item_id; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_translation_jobs_item_id ON public.translation_jobs USING btree (item_id);


--
-- Name: idx_translation_jobs_status; Type: INDEX; Schema: public; Owner: moreyu_admin
--

CREATE INDEX idx_translation_jobs_status ON public.translation_jobs USING btree (status);


--
-- Name: rss_feeds update_rss_feeds_updated_at; Type: TRIGGER; Schema: public; Owner: moreyu_admin
--

CREATE TRIGGER update_rss_feeds_updated_at BEFORE UPDATE ON public.rss_feeds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rss_items update_rss_items_updated_at; Type: TRIGGER; Schema: public; Owner: moreyu_admin
--

CREATE TRIGGER update_rss_items_updated_at BEFORE UPDATE ON public.rss_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: translation_jobs update_translation_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: moreyu_admin
--

CREATE TRIGGER update_translation_jobs_updated_at BEFORE UPDATE ON public.translation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rss_items rss_items_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.rss_items
    ADD CONSTRAINT rss_items_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES public.rss_feeds(id) ON DELETE CASCADE;


--
-- Name: translation_jobs translation_jobs_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moreyu_admin
--

ALTER TABLE ONLY public.translation_jobs
    ADD CONSTRAINT translation_jobs_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.rss_items(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO moreyu_admin;


--
-- PostgreSQL database dump complete
--

\unrestrict ACvGlzD08oQijTpu6Pm0HBMy23L5lv6v20LTNUCs0H1svmgc5yuhSy6ajZsdHGe

