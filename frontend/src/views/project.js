import React, { Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactPlaceholder from 'react-placeholder';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ProjectNav } from '../components/projects/projectNav';
import { MyProjectNav } from '../components/projects/myProjectNav';
import { MoreFiltersForm } from '../components/projects/moreFiltersForm';
import { ProjectDetail } from '../components/projectDetail/index';
import { ProjectCardPaginator } from '../components/projects/projectCardPaginator';
import { ProjectSearchResults } from '../components/projects/projectSearchResults';
import { ProjectsMap } from '../components/projects/projectsMap';
import PrivateProjectError from '../components/projectDetail/privateProjectError';
import { useExploreProjectsQueryParams, stringify } from '../hooks/UseProjectsQueryAPI';
import { useSetTitleTag } from '../hooks/UseMetaTags';
import { NotFound } from './notFound';
import { ProjectDetailPlaceholder } from '../components/projectDetail/projectDetailPlaceholder';
import { useProjectsQuery, useProjectQuery } from '../api/projects';

const ProjectCreate = React.lazy(() => import('../components/projectCreate/index'));

export const CreateProject = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectCreate />
    </Suspense>
  );
};

export const ProjectsPage = () => {
  useSetTitleTag('Explore projects');
  const { pathname } = useLocation();
  const action = useSelector((state) => state.preferences['action']);
  const [fullProjectsQuery, setProjectQuery] = useExploreProjectsQueryParams();
  const isMapShown = useSelector((state) => state.preferences['mapShown']);
  const searchResultWidth = isMapShown ? 'two-column' : 'one-column';

  const {
    data: projects,
    status,
    refetch,
  } = useProjectsQuery(fullProjectsQuery, action, {
    // prevent api call until the filters are applied
    enabled: !pathname.includes('/explore/filters/'),
  });

  return (
    <div className="pull-center">
      <ProjectNav>
        <Outlet />
      </ProjectNav>
      <section className={`${searchResultWidth} explore-projects-container`}>
        <div>
          <ProjectSearchResults
            className={`${isMapShown ? 'pl3' : 'ph3'}`}
            status={status}
            projects={projects?.results}
            pagination={projects?.pagination}
            retryFn={refetch}
          />
          <ProjectCardPaginator
            status={status}
            pagination={projects?.pagination}
            fullProjectsQuery={fullProjectsQuery}
            setQueryParam={setProjectQuery}
          />
        </div>
        {isMapShown && (
          <div className="explore-projects-map">
            <ProjectsMap
              mapResults={projects?.mapResults}
              fullProjectsQuery={fullProjectsQuery}
              setQuery={setProjectQuery}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export const UserProjectsPage = ({ management }) => {
  const location = useLocation();
  const navigate = useNavigate();
  useSetTitleTag(management ? 'Manage projects' : 'My projects');
  const userToken = useSelector((state) => state.auth.token);

  const [fullProjectsQuery, setProjectQuery] = useExploreProjectsQueryParams();
  const isMapShown = useSelector((state) => state.preferences['mapShown']);
  const searchResultWidth = isMapShown ? 'two-column' : 'one-column';

  const { data: projects, status, refetch } = useProjectsQuery(fullProjectsQuery);

  useEffect(() => {
    if (!userToken) {
      /* use replace to so the back button does not get interrupted */
      navigate('/login', { replace: true });
    }
  }, [navigate, userToken]);

  if (
    !fullProjectsQuery.createdByMe &&
    !fullProjectsQuery.managedByMe &&
    !fullProjectsQuery.mappedByMe &&
    !fullProjectsQuery.favoritedByMe &&
    !fullProjectsQuery.status
  ) {
    setProjectQuery({ managedByMe: true });
  }

  return (
    <div className="pull-center">
      <MyProjectNav location={location} management={management} />
      <section className={`${searchResultWidth} explore-projects-container`}>
        <div>
          <ProjectSearchResults
            status={status}
            projects={projects?.results}
            pagination={projects?.pagination}
            retryFn={refetch}
            showBottomButtons={location?.pathname.startsWith('/manage/')}
            management={management}
          />
          <ProjectCardPaginator
            status={status}
            pagination={projects?.pagination}
            fullProjectsQuery={fullProjectsQuery}
            setQueryParam={setProjectQuery}
          />
        </div>
        {isMapShown && (
          <div className="explore-projects-map">
            <ProjectsMap
              mapResults={projects?.mapResults}
              fullProjectsQuery={fullProjectsQuery}
              setQuery={setProjectQuery}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export const ProjectsPageIndex = (props) => {
  return null;
};

export const MoreFilters = () => {
  const navigate = useNavigate();
  const [fullProjectsQuery] = useExploreProjectsQueryParams();
  const [componentHeight, setComponentHeight] = useState(`${window.innerHeight}px`);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    const contentHeight =
      document.getElementById('explore-nav').offsetHeight +
      document.getElementById('top-header').offsetHeight;

    const handleResize = () => {
      setComponentHeight(window.innerHeight - contentHeight);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const currentUrl = `/explore${
    stringify(fullProjectsQuery) ? ['?', stringify(fullProjectsQuery)].join('') : ''
  }`;

  return (
    <>
      <div
        className="absolute left-0 z-4 mt1 w-40-l w-100 bg-white h4 ph1 ph5-l"
        style={{ height: `${componentHeight}px` }}
      >
        <div className="scrollable-container h-100  overflow-x-hidden overflow-y-auto">
          <MoreFiltersForm currentUrl={currentUrl} />
        </div>
      </div>
      <div
        onClick={() => navigate(currentUrl)}
        role="button"
        className="absolute right-0 z-4 br w-60-l w-0 h-100 bg-blue-dark o-70 h6"
      />
    </>
  );
};

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, status, error } = useProjectQuery(id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (status === 'loading') {
    return (
      <ReactPlaceholder
        showLoadingAnimation={true}
        customPlaceholder={<ProjectDetailPlaceholder />}
        ready={false}
      />
    );
  }
  if (status === 'error') {
    return (
      <>
        {error.response.data.SubCode === 'PrivateProject' ? (
          <PrivateProjectError />
        ) : (
          <NotFound projectId={id} />
        )}
      </>
    );
  }
  return (
    <ProjectDetail
      project={project.data}
      projectLoading={false}
      tasksError={false}
      tasks={project.data.tasks}
      navigate={navigate}
      type="detail"
    />
  );
};

export const ManageProjectsPage = (props) => <UserProjectsPage {...props} management={true} />;
